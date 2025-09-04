import pymysql
from app.config import DB_CONFIG
from pymysql.cursors import DictCursor

TABLES = {
    "product": ("product", "product_id"),
    "therapy": ("therapy", "therapy_id"),
    "product_bundle": ("product_bundles", "bundle_id"),
    "therapy_bundle": ("therapy_bundles", "bundle_id"),
}


def connect_to_db():
    return pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)


def publish_item(item_type: str, item_id: int):
    table_info = TABLES.get(item_type)
    if not table_info:
        raise ValueError("Unsupported item type")
    table, pk = table_info
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"UPDATE {table} SET status='PUBLISHED', unpublished_reason=NULL WHERE {pk}=%s",
                (item_id,),
            )
        conn.commit()
    finally:
        conn.close()


def unpublish_item(item_type: str, item_id: int, reason: str | None = None):
    table_info = TABLES.get(item_type)
    if not table_info:
        raise ValueError("Unsupported item type")
    table, pk = table_info
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"UPDATE {table} SET status='UNPUBLISHED', unpublished_reason=%s WHERE {pk}=%s",
                (reason, item_id),
            )
        conn.commit()
    finally:
        conn.close()
