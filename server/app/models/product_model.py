import pymysql
from app.config import DB_CONFIG
from pymysql.cursors import DictCursor


def connect_to_db():
    """建立資料庫連線"""
    return pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)


def insert_product(data: dict):
    """新增產品資料"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = (
                "INSERT INTO product (code, name, price) "
                "VALUES (%s, %s, %s)"
            )
            cursor.execute(query, (data['code'], data['name'], data['price']))
            product_id = conn.insert_id()
        conn.commit()
        return product_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

