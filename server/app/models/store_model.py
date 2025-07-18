import pymysql
import bcrypt
from app.config import DB_CONFIG
from pymysql.cursors import DictCursor

def connect_to_db():
    """建立資料庫連線"""
    return pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)

def create_store(store_data: dict):
    """
    新增一筆分店資料到 store 資料表。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 使用 bcrypt 對密碼進行加密
            password = store_data['password'].encode('utf-8')
            hashed_password = bcrypt.hashpw(password, bcrypt.gensalt())

            query = """
                INSERT INTO store (account, store_name, store_location, password, permission)
                VALUES (%s, %s, %s, %s, %s)
            """
            # permission 硬編碼為 'basic'，因為我們正在新增的是「分店」
            values = (
                store_data['account'],
                store_data['store_name'],
                store_data.get('store_location', None), # store_location 是可選的
                hashed_password,
                'basic'
            )
            cursor.execute(query, values)
            store_id = conn.insert_id()
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
                SELECT store_id, account, store_name, store_location, permission 
                FROM store 
                ORDER BY store_id ASC
            """
            cursor.execute(query)
            return cursor.fetchall()
    finally:
        conn.close()