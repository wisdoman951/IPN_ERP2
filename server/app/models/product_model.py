import pymysql
import json
from app.config import DB_CONFIG
from pymysql.cursors import DictCursor


def connect_to_db():
    """建立資料庫連線"""
    return pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)


def create_product(data: dict):
    """新增一筆產品資料"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = (
                "INSERT INTO product (code, name, price, purchase_price, visible_store_ids, status) "
                "VALUES (%s, %s, %s, %s, %s, 'PUBLISHED')"
            )
            cursor.execute(query, (
                data.get("code"),
                data.get("name"),
                data.get("price"),
                data.get("purchase_price"),
                json.dumps(data.get("visible_store_ids")) if data.get("visible_store_ids") is not None else None,
            ))
            product_id = conn.insert_id()

            # 關聯分類
            category_ids = data.get("category_ids", [])
            for cid in category_ids:
                cursor.execute(
                    "INSERT INTO product_category (product_id, category_id) VALUES (%s, %s)",
                    (product_id, cid),
                )
        conn.commit()
        return product_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def update_product(product_id: int, data: dict):
    """更新產品資料"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = (
                "UPDATE product SET code=%s, name=%s, price=%s, purchase_price=%s, visible_store_ids=%s WHERE product_id=%s"
            )
            cursor.execute(query, (
                data.get("code"),
                data.get("name"),
                data.get("price"),
                data.get("purchase_price"),
                json.dumps(data.get("visible_store_ids")) if data.get("visible_store_ids") is not None else None,
                product_id,
            ))

            if "category_ids" in data:
                cursor.execute(
                    "DELETE FROM product_category WHERE product_id=%s",
                    (product_id,),
                )
                for cid in data.get("category_ids", []):
                    cursor.execute(
                        "INSERT INTO product_category (product_id, category_id) VALUES (%s, %s)",
                        (product_id, cid),
                    )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def delete_product(product_id: int):
    """刪除產品資料並保留相關的銷售紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 先取得產品名稱，保存到銷售紀錄中以供日後查詢
            cursor.execute(
                "SELECT name FROM product WHERE product_id=%s",
                (product_id,),
            )
            result = cursor.fetchone()
            product_name = result["name"] if result else None

            if product_name:
                cursor.execute(
                    "UPDATE product_sell SET product_name = %s WHERE product_id=%s",
                    (product_name, product_id),
                )

            # 將 product_sell 中引用此產品的紀錄設為 NULL，以保留銷售歷史
            cursor.execute(
                "UPDATE product_sell SET product_id = NULL WHERE product_id=%s",
                (product_id,),
            )
            # 再刪除產品本身
            cursor.execute(
                "DELETE FROM product_category WHERE product_id=%s",
                (product_id,),
            )
            cursor.execute("DELETE FROM product WHERE product_id=%s", (product_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
