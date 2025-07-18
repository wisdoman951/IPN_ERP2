# server\app\models\login_model.py
import pymysql
from app.config import DB_CONFIG
def connect_to_db():
    print(f"DEBUG login_model.py: Attempting to connect with DB_CONFIG: {DB_CONFIG}") # <--- ADD THIS LINE
    if not DB_CONFIG.get("database"):
        print(f"CRITICAL DEBUG login_model.py: DB_CONFIG['database'] is '{DB_CONFIG.get('database')}' (missing or empty)!")
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)


def find_store_by_account(account):
    """根據帳號查找店鋪信息"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 使用 account 欄位查詢
            cursor.execute("SELECT * FROM store WHERE account = %s", (account,))
            result = cursor.fetchone()
            
            # 直接返回原始數據結構
            return result
    finally:
        conn.close()

def update_store_password(account, new_password):
    """更新商店帳號密碼"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 更新密碼，使用 account 欄位
            cursor.execute(
                "UPDATE store SET password = %s WHERE account = %s", 
                (new_password, account)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_store_info(store_id):
    """根據 ID 獲取商店資訊"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM store WHERE store_id = %s", (store_id,))
            result = cursor.fetchone()
            
            # 直接返回原始數據結構
            return result
    finally:
        conn.close()

def get_all_stores():
    """獲取所有商店信息"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM store")
            results = cursor.fetchall()
            return results
    finally:
        conn.close()
