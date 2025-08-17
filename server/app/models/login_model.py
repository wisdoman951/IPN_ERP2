# server\app\models\login_model.py
import pymysql
from app.config import DB_CONFIG


def connect_to_db():
    print(f"DEBUG login_model.py: Attempting to connect with DB_CONFIG: {DB_CONFIG}")  # <--- ADD THIS LINE
    if not DB_CONFIG.get("database"):
        print(
            f"CRITICAL DEBUG login_model.py: DB_CONFIG['database'] is '{DB_CONFIG.get('database')}' (missing or empty)!"
        )
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)


def find_staff_by_account(account):
    """根據登入帳號查找員工與其分店資訊"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT s.store_id, s.store_name, s.store_location,
                       st.staff_id, st.account, st.password, st.permission
                FROM staff AS st
                JOIN store AS s ON st.store_id = s.store_id
                WHERE st.account = %s
                """,
                (account,)
            )
            return cursor.fetchone()
    finally:
        conn.close()


def update_staff_password(account, new_password):
    """更新員工登入密碼"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE staff SET password = %s WHERE account = %s",
                (new_password, account),
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_store_info(store_id):
    """根據 store_id 獲取分店與其員工帳號"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT s.store_id, s.store_name, s.store_location,
                       st.staff_id, st.account, st.permission
                FROM store AS s
                LEFT JOIN staff AS st ON st.store_id = s.store_id
                WHERE s.store_id = %s
                """,
                (store_id,)
            )
            return cursor.fetchall()
    finally:
        conn.close()


def get_all_stores():
    """獲取所有分店與其員工帳號資訊"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT s.store_id, s.store_name, s.store_location,
                       st.staff_id, st.account, st.permission
                FROM store AS s
                LEFT JOIN staff AS st ON st.store_id = s.store_id
                ORDER BY s.store_id ASC
                """
            )
            return cursor.fetchall()
    finally:
        conn.close()
