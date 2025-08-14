# IPN_ERP/server/app/models/member_model.py

import pymysql
from app.config import DB_CONFIG
import re
import traceback

def connect_to_db():
    """確保返回的資料是字典格式，方便操作"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

# --- 修改後的核心函式 ---
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

            sql = """
                INSERT INTO member (
                    member_code, name, birthday, gender, blood_type,
                    line_id, address, inferrer_id, phone, occupation, note,
                    store_id 
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                data.get("member_code"),
                data.get("name"),
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
            base_sql = """
                SELECT member_id, member_code, name, birthday, address, phone, gender, blood_type,
                       line_id, inferrer_id, occupation, note, store_id
                FROM member
            """
            params = []
            
            if store_level == "分店":
                base_sql += " WHERE store_id = %s"
                params.append(store_id)
            
            base_sql += " ORDER BY member_id DESC"
            
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
            
            base_sql = """
                SELECT member_id, member_code, name, birthday, address, phone, gender, blood_type,
                       line_id, inferrer_id, occupation, note, store_id
                FROM member
                WHERE (name LIKE %s OR phone LIKE %s OR member_code LIKE %s)
            """
            params = [like_keyword, like_keyword, like_keyword]

            if store_level == "分店":
                base_sql += " AND store_id = %s"
                params.append(store_id)

            base_sql += " ORDER BY member_id DESC"

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
            # 關聯表列表
            related_tables = [
                "product_sell", "therapy_sell", "therapy_record", "ipn_pure",
                "ipn_stress", "medical_record", "usual_sympton_and_family_history"
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

            cursor.execute("""
                UPDATE member SET
                    name=%s, birthday=%s, address=%s, phone=%s, gender=%s,
                    blood_type=%s, line_id=%s, inferrer_id=%s, occupation=%s, note=%s
                WHERE member_id = %s
            """, (
                data.get("name"), data.get("birthday"), data.get("address"),
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
            cursor.execute("""
                SELECT member_id, member_code, name, birthday, address, phone, gender, blood_type,
                       line_id, inferrer_id, occupation, note, store_id
                FROM member
                WHERE member_id = %s
            """, (member_id,))
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

def get_next_member_code():
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = "SELECT member_code FROM member ORDER BY member_id DESC LIMIT 1"
            cursor.execute(query)
            last_member = cursor.fetchone()
            if last_member and last_member.get('member_code'):
                last_code = last_member['member_code']
                match = re.match(r'([A-Za-z]*)(\d+)', last_code)
                if match:
                    prefix, number_part = match.groups()
                    next_number = int(number_part) + 1
                    new_code = f"{prefix}{str(next_number).zfill(len(number_part))}"
                else:
                    new_code = "M-ERROR"
            else:
                new_code = "M001"
            return {"success": True, "next_code": new_code}
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}
    finally:
        if conn:
            conn.close()
