import pymysql
import json
from typing import Iterable
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
            inventory_column = _get_product_inventory_column(cursor)
            has_inventory_link = inventory_column is not None

            inventory_item_id = None
            if has_inventory_link:
                inventory_item_id = _resolve_inventory_item_id(cursor, data)

            if has_inventory_link:
                query = (
                    "INSERT INTO product (code, name, price, purchase_price, visible_store_ids, visible_permissions, status, inventory_item_id) "
                    "VALUES (%s, %s, %s, %s, %s, %s, 'PUBLISHED', %s)"
                )
            else:
                query = (
                    "INSERT INTO product (code, name, price, purchase_price, visible_store_ids, visible_permissions, status) "
                    "VALUES (%s, %s, %s, %s, %s, %s, 'PUBLISHED')"
                )

            params = [
                data.get("code"),
                data.get("name"),
                data.get("price"),
                data.get("purchase_price"),
                json.dumps(data.get("visible_store_ids")) if data.get("visible_store_ids") is not None else None,
                json.dumps(data.get("visible_permissions")) if data.get("visible_permissions") is not None else None,
            ]

            if has_inventory_link:
                params.append(inventory_item_id)

            cursor.execute(query, params)
            product_id = conn.insert_id()

            _sync_product_price_tiers(cursor, product_id, data.get("price_tiers"))

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


def find_products_with_prefix(code_prefix: str) -> list[dict]:
    """列出與指定產品編號前綴相符的產品。"""
    if not code_prefix:
        return []

    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT product_id, name, code FROM product WHERE LEFT(code, %s) = %s",
                (len(code_prefix), code_prefix),
            )
            return list(cursor.fetchall())
    finally:
        conn.close()


def update_product(product_id: int, data: dict):
    """更新產品資料"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            inventory_column = _get_product_inventory_column(cursor)
            has_inventory_link = inventory_column is not None

            if has_inventory_link:
                cursor.execute(
                    "SELECT inventory_item_id FROM product WHERE product_id = %s",
                    (product_id,),
                )
                existing_row = cursor.fetchone()
                current_inventory_item_id = (
                    existing_row.get("inventory_item_id") if existing_row else None
                )

                inventory_item_id = data.get("inventory_item_id", current_inventory_item_id)
                if inventory_item_id is not None:
                    _assert_inventory_item_exists(cursor, inventory_item_id)

                query = (
                    "UPDATE product SET code=%s, name=%s, price=%s, purchase_price=%s, visible_store_ids=%s, visible_permissions=%s, inventory_item_id=%s WHERE product_id=%s"
                )
            else:
                query = (
                    "UPDATE product SET code=%s, name=%s, price=%s, purchase_price=%s, visible_store_ids=%s, visible_permissions=%s WHERE product_id=%s"
                )

            params = [
                data.get("code"),
                data.get("name"),
                data.get("price"),
                data.get("purchase_price"),
                json.dumps(data.get("visible_store_ids")) if data.get("visible_store_ids") is not None else None,
                json.dumps(data.get("visible_permissions")) if data.get("visible_permissions") is not None else None,
            ]

            if has_inventory_link:
                params.append(inventory_item_id)

            params.append(product_id)

            cursor.execute(query, params)

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

            _sync_product_price_tiers(cursor, product_id, data.get("price_tiers"))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def _sync_product_price_tiers(cursor, product_id: int, tiers: Iterable[dict] | None):
    """Replace product price tiers for a given product."""
    cursor.execute("DELETE FROM product_price_tier WHERE product_id = %s", (product_id,))
    if not tiers:
        return

    values = []
    for tier in tiers:
        identity = tier.get("identity_type")
        price = tier.get("price")
        if identity is None or price is None:
            continue
        values.append((product_id, identity, price))

    if values:
        cursor.executemany(
            "INSERT INTO product_price_tier (product_id, identity_type, price) VALUES (%s, %s, %s)",
            values,
        )


def _product_has_inventory_item_id(cursor) -> bool:
    """Check if the product table has an inventory_item_id column."""
    return _get_product_inventory_column(cursor) is not None


def _get_product_inventory_column(cursor):
    cursor.execute("SHOW COLUMNS FROM product LIKE 'inventory_item_id'")
    return cursor.fetchone()


def _assert_inventory_item_exists(cursor, inventory_item_id):
    cursor.execute(
        "SELECT 1 FROM inventory_items WHERE inventory_item_id = %s",
        (inventory_item_id,),
    )
    if cursor.fetchone() is None:
        raise ValueError("指定的庫存品項不存在，請重新選擇或建立後再試一次。")


def _resolve_inventory_item_id(cursor, product_data: dict):
    """確保產品插入時具備有效的庫存品項編號。"""
    inventory_item_id = product_data.get("inventory_item_id")

    if inventory_item_id is not None:
        _assert_inventory_item_exists(cursor, inventory_item_id)
        return inventory_item_id

    if not _inventory_items_table_exists(cursor):
        raise ValueError("缺少庫存品項資訊，請先建立對應庫存品項後再新增產品。")

    new_inventory_item_id = _create_inventory_item_stub(cursor, product_data)
    if new_inventory_item_id is None:
        raise ValueError("無法為產品建立對應庫存品項，請確認資料表設定。")

    return new_inventory_item_id


def _inventory_items_table_exists(cursor) -> bool:
    cursor.execute("SHOW TABLES LIKE 'inventory_items'")
    return cursor.fetchone() is not None


def _create_inventory_item_stub(cursor, product_data: dict):
    """根據現有欄位建立最小化的庫存品項，避免外鍵錯誤。"""
    cursor.execute("SHOW COLUMNS FROM inventory_items")
    columns = cursor.fetchall()

    if not columns:
        return None

    insertable_columns = []
    values = []

    for column in columns:
        field = column.get("Field")
        extra = column.get("Extra")
        if extra and "auto_increment" in extra:
            continue

        value = None
        if field in {"name", "item_name", "product_name"}:
            value = product_data.get("name")
        elif field in {"code", "item_code", "sku"}:
            value = product_data.get("code")
        elif field in {"purchase_price", "cost"}:
            value = product_data.get("purchase_price")
        elif field in {"price", "sale_price"}:
            value = product_data.get("price")
        elif field == "status":
            value = product_data.get("status") or "ACTIVE"

        if value is None and column.get("Null") == "NO" and column.get("Default") is None:
            # 仍缺值且為必填欄位，給予安全預設值
            value = 0

        if value is not None:
            insertable_columns.append(field)
            values.append(value)

    if not insertable_columns:
        cursor.execute("INSERT INTO inventory_items () VALUES ()")
    else:
        columns_sql = ", ".join(insertable_columns)
        placeholders = ", ".join(["%s"] * len(values))
        cursor.execute(
            f"INSERT INTO inventory_items ({columns_sql}) VALUES ({placeholders})",
            values,
        )

    return cursor.connection.insert_id()


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
