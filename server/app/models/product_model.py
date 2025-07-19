import pymysql
from app.config import DB_CONFIG


def connect_to_db():
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)


def insert_product(data: dict):
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = (
                "INSERT INTO product (code, name, unit, category, price) "
                "VALUES (%s, %s, %s, %s, %s)"
            )
            cursor.execute(
                query,
                (
                    data.get("code"),
                    data.get("name"),
                    data.get("unit"),
                    data.get("category"),
                    data.get("price"),
                ),
            )
        conn.commit()
        return conn.insert_id()
    finally:
        conn.close()
