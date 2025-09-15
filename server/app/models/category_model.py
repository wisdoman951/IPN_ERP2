import pymysql
from app.config import DB_CONFIG
from pymysql.cursors import DictCursor


def connect_to_db():
    return pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)


def create_category(name: str, target_type: str):
    """Create new category"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO category (name, target_type) VALUES (%s, %s)",
                (name, target_type),
            )
            category_id = conn.insert_id()
        conn.commit()
        return category_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_categories(target_type: str | None = None):
    """Fetch categories, optionally filtered by target_type"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            if target_type:
                cursor.execute(
                    "SELECT * FROM category WHERE target_type=%s ORDER BY name",
                    (target_type,),
                )
            else:
                cursor.execute("SELECT * FROM category ORDER BY name")
            return cursor.fetchall()
    finally:
        conn.close()


def delete_category(category_id: int):
    """Delete category"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM category WHERE category_id=%s", (category_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
