# IPN_ERP/server/app/models/member_model.py

import pymysql
from app.config import DB_CONFIG
import re
import traceback


IDENTITY_TYPE_TABLE_EXISTS = None
IDENTITY_TYPE_NAME_COLUMN_EXISTS = None
IDENTITY_TYPE_DISPLAY_NAME_COLUMN_EXISTS = None

def connect_to_db():
    """確保返回的資料是字典格式，方便操作"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

# --- 修改後的核心函式 ---
def _check_identity_type_table(cursor) -> bool:
    """Return True if the member_identity_type lookup table exists."""
    global IDENTITY_TYPE_TABLE_EXISTS, IDENTITY_TYPE_NAME_COLUMN_EXISTS, IDENTITY_TYPE_DISPLAY_NAME_COLUMN_EXISTS
    if IDENTITY_TYPE_TABLE_EXISTS is None:
        try:
            cursor.execute("SHOW TABLES LIKE 'member_identity_type'")
            IDENTITY_TYPE_TABLE_EXISTS = cursor.fetchone() is not None
        except Exception:
            IDENTITY_TYPE_TABLE_EXISTS = False

    if IDENTITY_TYPE_TABLE_EXISTS and IDENTITY_TYPE_NAME_COLUMN_EXISTS is None:
        try:
            cursor.execute("SHOW COLUMNS FROM member_identity_type LIKE 'identity_type_name'")
            IDENTITY_TYPE_NAME_COLUMN_EXISTS = cursor.fetchone() is not None
        except Exception:
            IDENTITY_TYPE_NAME_COLUMN_EXISTS = False

    if IDENTITY_TYPE_TABLE_EXISTS and IDENTITY_TYPE_DISPLAY_NAME_COLUMN_EXISTS is None:
        try:
            cursor.execute("SHOW COLUMNS FROM member_identity_type LIKE 'display_name'")
            IDENTITY_TYPE_DISPLAY_NAME_COLUMN_EXISTS = cursor.fetchone() is not None
        except Exception:
            IDENTITY_TYPE_DISPLAY_NAME_COLUMN_EXISTS = False

    return IDENTITY_TYPE_TABLE_EXISTS


def _normalize_identity_type(cursor, identity_type_value: str) -> str:
    """Resolve the identity type to the correct code used by the database."""
    if identity_type_value in (None, ""):
        return identity_type_value

    if not _check_identity_type_table(cursor):
        return identity_type_value or "一般會員"

    query = [
        "SELECT identity_type_code",
        "FROM member_identity_type",
        "WHERE identity_type_code = %s",
    ]
    params = [identity_type_value]

    if IDENTITY_TYPE_NAME_COLUMN_EXISTS:
        query.append("   OR identity_type_name = %s")
        params.append(identity_type_value)

    if IDENTITY_TYPE_DISPLAY_NAME_COLUMN_EXISTS:
        query.append("   OR display_name = %s")
        params.append(identity_type_value)

    query.append("LIMIT 1")

    try:
        cursor.execute("\n".join(query), tuple(params))
    except pymysql.err.ProgrammingError:
        return identity_type_value or "一般會員"
    row = cursor.fetchone()
    if row:
        return row["identity_type_code"]

    raise ValueError(f"未知的會員身份別: {identity_type_value}")


def _get_identity_type_query_parts(cursor):
    use_identity_table = _check_identity_type_table(cursor)
    if not use_identity_table:
        return "m.identity_type", ""

    if IDENTITY_TYPE_DISPLAY_NAME_COLUMN_EXISTS:
        identity_column = "COALESCE(mit.display_name, m.identity_type)"
    elif IDENTITY_TYPE_NAME_COLUMN_EXISTS:
        identity_column = "COALESCE(mit.identity_type_name, m.identity_type)"
    else:
        identity_column = "m.identity_type"
    join_identity_table = " LEFT JOIN member_identity_type mit ON m.identity_type = mit.identity_type_code"
    return identity_column, join_identity_table


def create_member(data, store_id: int):
    """
    新增一位會員到資料庫。
    需要傳入建立此會員的 store_id。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 防禦性檢查：如果血型是空字串，就把它設為 None (資料庫中的 NULL)
            blood_type_value = data.get("blood_type")
            if blood_type_value == '':
                blood_type_value = None

            identity_type_value = data.get("identity_type") or data.get("identityType") or "一般會員"
            identity_type_value = _normalize_identity_type(cursor, identity_type_value)

            sql = """
                INSERT INTO member (
                    member_code, name, identity_type, birthday, gender, blood_type,
                    line_id, address, inferrer_id, phone, occupation, note,
                    store_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                data.get("member_code"),
                data.get("name"),
                identity_type_value,
                data.get("birthday"),
                data.get("gender"),
                blood_type_value,
                data.get("line_id"),
                data.get("address"),
                data.get("inferrer_id"),
                data.get("phone"),
                data.get("occupation"),
                data.get("note"),
                store_id  # 將操作者所屬的 store_id 存入
            )
            cursor.execute(sql, params)
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_all_members(store_level: str, store_id: int):
    """
    根據使用者權限等級獲取會員列表。
    - 總店：獲取所有會員。
    - 分店：僅獲取該分店的會員。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            identity_column, join_identity_table = _get_identity_type_query_parts(cursor)

            base_sql = f"""
                SELECT m.member_id, m.member_code, m.name, {identity_column} AS identity_type, m.birthday, m.address, m.phone, m.gender, m.blood_type,
                       m.line_id, m.inferrer_id, m.occupation, m.note, m.store_id, s.store_name
                FROM member AS m
                LEFT JOIN store AS s ON m.store_id = s.store_id{join_identity_table}
            """
            params = []

            if store_level == "分店":
                base_sql += " WHERE m.store_id = %s"
                params.append(store_id)

            base_sql += (
                " ORDER BY m.store_id IS NULL, m.store_id, m.member_code IS NULL,"
                " COALESCE(CHAR_LENGTH(m.member_code), 0), m.member_code, m.member_id"
            )
            cursor.execute(base_sql, tuple(params))
            result = cursor.fetchall()
            return result
    finally:
        conn.close()

def search_members(keyword: str, store_level: str, store_id: int):
    """
    根據關鍵字和使用者權限等級搜尋會員。
    - 總店：在所有會員中搜尋。
    - 分店：僅在該分店的會員中搜尋。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            like_keyword = f"%{keyword}%"

            identity_column, join_identity_table = _get_identity_type_query_parts(cursor)

            base_sql = f"""
                SELECT m.member_id, m.member_code, m.name, {identity_column} AS identity_type, m.birthday, m.address, m.phone, m.gender, m.blood_type,
                       m.line_id, m.inferrer_id, m.occupation, m.note, m.store_id, s.store_name
                FROM member AS m
                LEFT JOIN store AS s ON m.store_id = s.store_id{join_identity_table}
                WHERE (m.name LIKE %s OR m.phone LIKE %s OR m.member_code LIKE %s)
            """
            params = [like_keyword, like_keyword, like_keyword]

            if store_level == "分店":
                base_sql += " AND m.store_id = %s"
                params.append(store_id)

            base_sql += (
                " ORDER BY m.store_id IS NULL, m.store_id, m.member_code IS NULL,"
                " COALESCE(CHAR_LENGTH(m.member_code), 0), m.member_code, m.member_id"
            )

            cursor.execute(base_sql, tuple(params))
            result = cursor.fetchall()
            return result
    finally:
        conn.close()

# 注意：刪除和更新操作也應該在路由層加上權限判斷，
# 確保分店A的使用者不能刪除或更新分店B的會員。
# 目前 model 層暫不修改，但在路由層必須處理。
def delete_member_and_related_data(member_id: int):
    conn = None
    try:
        conn = connect_to_db()
        conn.begin()

        with conn.cursor() as cursor:
            # 先刪除有外鍵依賴的 ipn_stress_answer
            cursor.execute(
                """
                DELETE a FROM ipn_stress_answer a
                JOIN ipn_stress s ON a.ipn_stress_id = s.ipn_stress_id
                WHERE s.member_id = %s
                """,
                (member_id,)
            )

            # 關聯表列表 (直接以 member_id 關聯)
            related_tables = [
                "product_sell", "therapy_sell", "therapy_record", "ipn_pure",
                "ipn_stress", "medical_record", "health_status", "usual_sympton_and_family_history"
            ]
            for table in related_tables:
                cursor.execute(f"DELETE FROM `{table}` WHERE member_id = %s", (member_id,))

            # 最後刪除主表
            deleted_count = cursor.execute("DELETE FROM member WHERE member_id = %s", (member_id,))

            if deleted_count == 0:
                raise ValueError(f"會員 ID {member_id} 不存在，無法刪除。")

        conn.commit()
        return {"success": True, "message": f"會員 {member_id} 及其所有相關紀錄已成功刪除。"}
        
    except Exception as e:
        if conn:
            conn.rollback()
        traceback.print_exc()
        raise e
    finally:
        if conn:
            conn.close()

def update_member(member_id, data):
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 同樣對血型做防禦性檢查
            blood_type_value = data.get("blood_type")
            if blood_type_value == '':
                blood_type_value = None

            identity_type_value = data.get("identity_type") or data.get("identityType") or "一般會員"
            identity_type_value = _normalize_identity_type(cursor, identity_type_value)

            cursor.execute("""
                UPDATE member SET
                    name=%s, identity_type=%s, birthday=%s, address=%s, phone=%s, gender=%s,
                    blood_type=%s, line_id=%s, inferrer_id=%s, occupation=%s, note=%s
                WHERE member_id = %s
            """, (
                data.get("name"), identity_type_value, data.get("birthday"), data.get("address"),
                data.get("phone"), data.get("gender"), blood_type_value,
                data.get("line_id"), data.get("inferrer_id"), data.get("occupation"),
                data.get("note"), member_id
            ))
        conn.commit()
    finally:
        conn.close()

def get_member_by_id(member_id: int):
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            identity_column, join_identity_table = _get_identity_type_query_parts(cursor)
            cursor.execute(
                f"""
                SELECT m.member_id, m.member_code, m.name, {identity_column} AS identity_type, m.birthday, m.address, m.phone, m.gender, m.blood_type,
                       m.line_id, m.inferrer_id, m.occupation, m.note, m.store_id, s.store_name
                FROM member AS m
                LEFT JOIN store AS s ON m.store_id = s.store_id{join_identity_table}
                WHERE m.member_id = %s
            """,
                (member_id,),
            )
            result = cursor.fetchone()
        return result
    finally:
        conn.close()

def get_member_by_code(member_code: str):
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            identity_column, join_identity_table = _get_identity_type_query_parts(cursor)
            cursor.execute(
                f"""
                SELECT m.member_id, m.member_code, m.name, {identity_column} AS identity_type, m.birthday, m.address, m.phone, m.gender, m.blood_type,
                       m.line_id, m.inferrer_id, m.occupation, m.note, m.store_id
                FROM member AS m{join_identity_table}
                WHERE m.member_code = %s
                """,
                (member_code,),
            )
            result = cursor.fetchone()
        return result
    finally:
        conn.close()

def check_member_exists(member_id: int):
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as count FROM member WHERE member_id = %s", (member_id,))
            result = cursor.fetchone()
        return result["count"] > 0
    finally:
        conn.close()


def check_member_code_exists(member_code: str):
    """Check if the given member_code already exists in the database."""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) as count FROM member WHERE member_code = %s",
                (member_code,),
            )
            result = cursor.fetchone()
        return result["count"] > 0
    finally:
        conn.close()

def get_next_member_code(store_id: int):
    """Generate the next member code based on the store's custom pattern."""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            if store_id == 2:
                # Only consider codes like M0001, M0002... and order by numeric part
                query = (
                    "SELECT member_code FROM member WHERE store_id = %s "
                    "AND member_code REGEXP '^M[0-9]{4}$' "
                    "ORDER BY CAST(SUBSTRING(member_code, 2) AS UNSIGNED) DESC LIMIT 1"
                )
            elif store_id in (3, 4, 5):
                # Pure numeric codes (some with leading zeros). Order numerically.
                query = (
                    "SELECT member_code FROM member WHERE store_id = %s "
                    "AND member_code REGEXP '^[0-9]+$' "
                    "ORDER BY CAST(member_code AS UNSIGNED) DESC LIMIT 1"
                )
            else:
                # Default ordering by code string
                query = (
                    "SELECT member_code FROM member WHERE store_id = %s "
                    "ORDER BY member_code DESC LIMIT 1"
                )

            cursor.execute(query, (store_id,))
            last_member = cursor.fetchone()
            last_code = last_member.get('member_code') if last_member else None

            # Store specific numbering rules
            if store_id == 2:
                # Format: M + 4 digit number (e.g. M0001)
                if last_code and re.match(r'^M(\d{4})$', last_code):
                    new_code = f"M{int(last_code[1:]) + 1:04d}"
                else:
                    new_code = "M0001"
            elif store_id == 3:
                # Numeric string starting with 10 (e.g. 101859)
                if last_code and re.match(r'^10\d+$', last_code):
                    new_code = str(int(last_code) + 1)
                else:
                    new_code = "100001"
            elif store_id == 4:
                # Leading zeros (e.g. 000557)
                if last_code and last_code.isdigit():
                    new_code = str(int(last_code) + 1).zfill(len(last_code))
                else:
                    new_code = "000001"
            elif store_id == 5:
                # Simple incremental numbers (1,2,3,...)
                if last_code and last_code.isdigit():
                    new_code = str(int(last_code) + 1)
                else:
                    new_code = "1"
            else:
                # Default behaviour: prefix letters followed by numbers
                if last_code and re.match(r'([A-Za-z]*)(\d+)', last_code or ''):
                    match = re.match(r'([A-Za-z]*)(\d+)', last_code)
                    prefix, number_part = match.groups()
                    next_number = int(number_part) + 1
                    new_code = f"{prefix}{str(next_number).zfill(len(number_part))}"
                else:
                    new_code = "M001"

            return {"success": True, "next_code": new_code}
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}
    finally:
        if conn:
            conn.close()
