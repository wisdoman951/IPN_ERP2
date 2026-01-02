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
            query = (
                "INSERT INTO product (code, name, price, purchase_price, visible_store_ids, visible_permissions, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, 'PUBLISHED')"
            )
            cursor.execute(query, (
                data.get("code"),
                data.get("name"),
                data.get("price"),
                data.get("purchase_price"),
                json.dumps(data.get("visible_store_ids")) if data.get("visible_store_ids") is not None else None,
                json.dumps(data.get("visible_permissions")) if data.get("visible_permissions") is not None else None,
            ))
            product_id = conn.insert_id()

            _sync_master_product_entities(cursor, product_id, data)

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


def update_product(product_id: int, data: dict):
    """更新產品資料"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = (
                "UPDATE product SET code=%s, name=%s, price=%s, purchase_price=%s, visible_store_ids=%s, visible_permissions=%s WHERE product_id=%s"
            )
            cursor.execute(query, (
                data.get("code"),
                data.get("name"),
                data.get("price"),
                data.get("purchase_price"),
                json.dumps(data.get("visible_store_ids")) if data.get("visible_store_ids") is not None else None,
                json.dumps(data.get("visible_permissions")) if data.get("visible_permissions") is not None else None,
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

            _sync_product_price_tiers(cursor, product_id, data.get("price_tiers"))

            _sync_master_product_entities(cursor, product_id, data)
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def _sync_master_product_entities(cursor, product_id: int, data: dict):
    """Ensure master product, variant, and store-type costs stay in sync."""
    master_product_code = _derive_master_product_code(data.get("code"))
    master_product_name = _derive_master_product_name(data.get("name"))
    product_status = data.get("status", "PUBLISHED")
    master_status = "ACTIVE" if product_status == "PUBLISHED" else "INACTIVE"

    master_product_id = _upsert_master_product(
        cursor,
        master_product_code,
        master_product_name,
        master_status,
    )

    _upsert_product_variant(
        cursor,
        product_id,
        master_product_id,
        data.get("code"),
        data.get("name"),
        data.get("price"),
        master_status,
    )

    _sync_store_type_price(
        cursor,
        master_product_id,
        data.get("purchase_price"),
    )


def _derive_master_product_code(code: str | None) -> str:
    if not code:
        raise ValueError("建立主商品時必須提供產品編號")
    # Use a shared prefix so related SKUs (e.g. PCP0701/PCP0702/PCP0703)
    # aggregate under the same master product without flooding inbound
    # inventory screens with every variant code. Defaults to the first
    # 5 characters, which mirrors the previous grouping behavior that kept
    # inbound purchase lists concise.
    normalized = code.strip().upper()
    return normalized[:5] if len(normalized) > 5 else normalized


def _derive_master_product_name(name: str | None) -> str:
    if not name:
        return ""
    base = name.split("-", 1)[0].strip(" -")
    return base or name


def _upsert_master_product(cursor, master_product_code: str, name: str, status: str) -> int:
    cursor.execute(
        "SELECT master_product_id, name, status FROM master_product WHERE master_product_code = %s",
        (master_product_code,),
    )
    row = cursor.fetchone()
    if row:
        master_product_id = row["master_product_id"]
        updates = []
        params = []
        existing_name = row.get("name")
        desired_name = name or master_product_code

        # Avoid overwriting an existing master product name derived from the
        # first SKU in a group. Only update the name when it is empty or still
        # matches the default code-derived placeholder.
        if (existing_name or "").strip() in {"", master_product_code} and desired_name != existing_name:
            updates.append("name = %s")
            params.append(desired_name)

        if row.get("status") != status:
            updates.append("status = %s")
            params.append(status)

        if updates:
            params.append(master_product_id)
            cursor.execute(
                f"UPDATE master_product SET {', '.join(updates)} WHERE master_product_id = %s",
                params,
            )
        return master_product_id

    cursor.execute(
        "INSERT INTO master_product (master_product_code, name, status) VALUES (%s, %s, %s)",
        (master_product_code, name or master_product_code, status),
    )
    return cursor.lastrowid


def _upsert_product_variant(
    cursor,
    product_id: int,
    master_product_id: int,
    variant_code: str | None,
    display_name: str | None,
    sale_price,
    status: str,
):
    cursor.execute(
        """
        INSERT INTO product_variant (variant_id, master_product_id, variant_code, display_name, sale_price, status)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            master_product_id = VALUES(master_product_id),
            variant_code = VALUES(variant_code),
            display_name = VALUES(display_name),
            sale_price = VALUES(sale_price),
            status = VALUES(status)
        """,
        (
            product_id,
            master_product_id,
            variant_code,
            display_name,
            sale_price,
            status,
        ),
    )


def _sync_store_type_price(cursor, master_product_id: int, purchase_price):
    if purchase_price is None:
        return
    for store_type in ("DIRECT", "FRANCHISE"):
        cursor.execute(
            """
            INSERT INTO store_type_price (master_product_id, store_type, cost_price)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE cost_price = VALUES(cost_price)
            """,
            (master_product_id, store_type, purchase_price),
        )


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
