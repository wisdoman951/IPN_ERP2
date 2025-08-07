import pymysql
import bcrypt
from app.config import DB_CONFIG
from pymysql.cursors import DictCursor

def connect_to_db():
    """建立資料庫連線"""
    return pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)

def create_store(store_data: dict):
    """新增一筆分店與其登入帳號"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 先新增分店資訊
            cursor.execute(
                "INSERT INTO store (store_name, store_location) VALUES (%s, %s)",
                (store_data['store_name'], store_data.get('store_location'))
            )
            store_id = conn.insert_id()

            # 建立登入帳號
            password = store_data['password'].encode('utf-8')
            hashed_password = bcrypt.hashpw(password, bcrypt.gensalt())
            cursor.execute(
                """
                INSERT INTO store_account (account, password, permission, store_id)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    store_data['account'],
                    hashed_password,
                    store_data.get('permission', 'basic'),
                    store_id,
                ),
            )
        conn.commit()
        return store_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_all_stores():
    """
    獲取所有分店的列表。
    注意：出於安全考量，我們不回傳 password 欄位。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT s.store_id, s.store_name, s.store_location,
                       sa.account, sa.permission
                FROM store AS s
                LEFT JOIN store_account AS sa ON sa.store_id = s.store_id
                ORDER BY s.store_id ASC
            """
            cursor.execute(query)
            return cursor.fetchall()
    finally:
        conn.close()