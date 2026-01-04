import json
from typing import Iterable

import pymysql
from pymysql.cursors import DictCursor

from app.config import DB_CONFIG

PREFIX_LENGTH = 5


def connect_to_db():
    """建立資料庫連線"""
    return pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)


def create_product(data: dict):
    """新增一筆產品資料"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            master_product_code, preferred_inventory_item_id = _prepare_master_context(
                cursor, data
            )

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

            _sync_master_product_entities(
                cursor,
                product_id,
                data,
                master_product_code_override=master_product_code,
                preferred_inventory_item_id=preferred_inventory_item_id,
            )

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
            master_product_code, preferred_inventory_item_id = _prepare_master_context(
                cursor, data
            )
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

            _sync_master_product_entities(
                cursor,
                product_id,
                data,
                master_product_code_override=master_product_code,
                preferred_inventory_item_id=preferred_inventory_item_id,
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def _sync_master_product_entities(
    cursor,
    product_id: int,
    data: dict,
    *,
    master_product_code_override: str | None = None,
    preferred_inventory_item_id: int | None = None,
):
    """Ensure inventory item + master product mapping stays in sync."""
    inventory_item_id = _get_or_create_inventory_item(
        cursor, data, preferred_inventory_item_id
    )
    master_product_code = (master_product_code_override or data.get("code") or "").strip().upper()
    master_product_name = (data.get("name") or "").strip()
    product_status = data.get("status", "PUBLISHED")
    master_status = "ACTIVE" if product_status == "PUBLISHED" else "INACTIVE"

    master_product_id = _upsert_master_product(
        cursor,
        master_product_code,
        master_product_name,
        master_status,
        inventory_item_id,
    )

    cursor.execute(
        "UPDATE product SET inventory_item_id = %s WHERE product_id = %s",
        (inventory_item_id, product_id),
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


def _prepare_master_context(cursor, data: dict) -> tuple[str, int | None]:
    """Handle prefix-based validation/merging before syncing master data."""

    master_product_code = (data.get("code") or "").strip().upper()
    if not master_product_code:
        raise ValueError("建立主商品時必須提供產品編號")

    prefix = master_product_code[:PREFIX_LENGTH]
    cursor.execute(
        """
        SELECT master_product_id, master_product_code, inventory_item_id, name
        FROM master_product
        WHERE master_product_code LIKE %s
        ORDER BY master_product_id ASC
        LIMIT 10
        """,
        (f"{prefix}%",),
    )
    existing = cursor.fetchall() or []

    if existing:
        merge_requested = bool(data.get("merge_with_prefix"))
        force_new = bool(data.get("force_new_prefix"))
        codes = [row["master_product_code"] for row in existing]
        if merge_requested:
            chosen = existing[0]
            return chosen["master_product_code"], chosen.get("inventory_item_id")
        if not force_new and master_product_code not in codes:
            names = "、".join({row.get("name") or row.get("master_product_code") for row in existing})
            raise ValueError(
                f"已存在相同前綴({prefix})的主商品：{', '.join(codes)}（{names}）。"
                " 若為同品項請帶 merge_with_prefix=true 共用庫存，若確定是不同商品請帶 force_new_prefix=true。"
            )

    return master_product_code, None


def _get_or_create_inventory_item(
    cursor, data: dict, preferred_inventory_item_id: int | None = None
) -> int:
    explicit_id = data.get("inventory_item_id")
    if explicit_id:
        cursor.execute(
            "SELECT inventory_item_id FROM inventory_items WHERE inventory_item_id = %s",
            (explicit_id,),
        )
        row = cursor.fetchone()
        if row:
            return row["inventory_item_id"]
        raise ValueError("指定的 inventory_item_id 不存在")

    if preferred_inventory_item_id:
        cursor.execute(
            "SELECT inventory_item_id FROM inventory_items WHERE inventory_item_id = %s",
            (preferred_inventory_item_id,),
        )
        row = cursor.fetchone()
        if row:
            return row["inventory_item_id"]

    name = (data.get("name") or "").strip()
    if not name:
        raise ValueError("建立庫存單位時必須提供產品名稱")

    cursor.execute(
        "SELECT inventory_item_id FROM inventory_items WHERE name = %s",
        (name,),
    )
    row = cursor.fetchone()
    if row:
        return row["inventory_item_id"]

    cursor.execute(
        "INSERT INTO inventory_items (inventory_code, name, status) VALUES (%s, %s, 'ACTIVE')",
        ((data.get("code") or None), name),
    )
    return cursor.lastrowid


def _upsert_master_product(cursor, master_product_code: str, name: str, status: str, inventory_item_id: int) -> int:
    if not master_product_code:
        raise ValueError("建立主商品時必須提供產品編號")

    cursor.execute(
        "SELECT master_product_id, name, status FROM master_product WHERE master_product_code = %s",
        (master_product_code,),
    )
    row = cursor.fetchone()
    if row:
        master_product_id = row["master_product_id"]
        updates = []
        params = []
        desired_name = name or master_product_code

        if desired_name and row.get("name") != desired_name:
            updates.append("name = %s")
            params.append(desired_name)
        if row.get("status") != status:
            updates.append("status = %s")
            params.append(status)
        updates.append("inventory_item_id = %s")
        params.append(inventory_item_id)

        if updates:
            params.append(master_product_id)
            cursor.execute(
                f"UPDATE master_product SET {', '.join(updates)} WHERE master_product_id = %s",
                params,
            )
        return master_product_id

    cursor.execute(
        "INSERT INTO master_product (master_product_code, name, status, inventory_item_id) VALUES (%s, %s, %s, %s)",
        (master_product_code, name or master_product_code, status, inventory_item_id),
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
            INSERT INTO store_type_price (master_product_id, inventory_item_id, store_type, cost_price)
            SELECT %s, mp.inventory_item_id, %s, %s FROM master_product mp WHERE mp.master_product_id = %s
            ON DUPLICATE KEY UPDATE cost_price = VALUES(cost_price), inventory_item_id = VALUES(inventory_item_id)
            """,
            (master_product_id, store_type, purchase_price, master_product_id),
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
