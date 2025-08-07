# server\app\models\login_model.py
import pymysql
from app.config import DB_CONFIG
def connect_to_db():
    print(f"DEBUG login_model.py: Attempting to connect with DB_CONFIG: {DB_CONFIG}") # <--- ADD THIS LINE
    if not DB_CONFIG.get("database"):
        print(f"CRITICAL DEBUG login_model.py: DB_CONFIG['database'] is '{DB_CONFIG.get('database')}' (missing or empty)!")
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)


def find_store_by_account(account):
    """根據登入帳號查找分店與帳號資訊"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT s.store_id, s.store_name, s.store_location,
                       sa.account, sa.password, sa.permission
                FROM store_account AS sa
                JOIN store AS s ON sa.store_id = s.store_id
                WHERE sa.account = %s
                """,
                (account,)
            )
            return cursor.fetchone()
    finally:
        conn.close()

def update_store_password(account, new_password):
    """更新商店帳號密碼"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE store_account SET password = %s WHERE account = %s",
                (new_password, account)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_store_info(store_id):
    """根據 store_id 獲取分店與其帳號"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT s.store_id, s.store_name, s.store_location,
                       sa.account, sa.permission
                FROM store AS s
                LEFT JOIN store_account AS sa ON sa.store_id = s.store_id
                WHERE s.store_id = %s
                """,
                (store_id,)
            )
            return cursor.fetchall()
    finally:
        conn.close()

def get_all_stores():
    """獲取所有分店與其帳號資訊"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT s.store_id, s.store_name, s.store_location,
                       sa.account, sa.permission
                FROM store AS s
                LEFT JOIN store_account AS sa ON sa.store_id = s.store_id
                ORDER BY s.store_id ASC
                """
            )
            return cursor.fetchall()
    finally:
        conn.close()
