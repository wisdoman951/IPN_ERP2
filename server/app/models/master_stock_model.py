"""Master stock management helpers."""
from __future__ import annotations

from decimal import Decimal
from functools import lru_cache
from typing import Iterable

import pymysql
from pymysql.cursors import DictCursor

from app.config import DB_CONFIG

VALID_STORE_TYPES = {"DIRECT", "FRANCHISE"}


def connect_to_db():
    return pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)


def _normalize_store_id(store_id: int | str | None) -> int | None:
    if store_id is None:
        return None
    try:
        return int(store_id)
    except (TypeError, ValueError):
        return None


def _normalize_store_type(store_type: str | None) -> str:
    if not store_type:
        return "DIRECT"
    upper = store_type.upper()
    return upper if upper in VALID_STORE_TYPES else "DIRECT"


def _convert_decimal_fields(rows: Iterable[dict], *fields: str) -> list[dict]:
    converted: list[dict] = []
    for row in rows:
        for field in fields:
            value = row.get(field)
            if isinstance(value, Decimal):
                row[field] = float(value)
        converted.append(row)
    return converted


def _require_store_id(store_id_value: int | None) -> int:
    if store_id_value is None:
        raise ValueError("請提供有效的 store_id")
    return store_id_value


@lru_cache(maxsize=1)
def _master_stock_supports_store_level() -> bool:
    """Detect whether the master_stock table tracks quantity by store."""

    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT 1
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'master_stock'
                  AND COLUMN_NAME = 'store_id'
                LIMIT 1
                """
            )
            return cursor.fetchone() is not None
    except pymysql.MySQLError:
        # 若查詢失敗，回傳 False 以避免阻斷主要流程
        return False
    finally:
        conn.close()


def list_master_products_for_inbound(
    store_type: str | None,
    store_id: int | str | None,
    keyword: str | None = None,
) -> list[dict]:
    """Return active master products with store-type-specific cost price."""
    store_type = _normalize_store_type(store_type)
    store_id_value = _normalize_store_id(store_id)
    store_scoped_stock = _master_stock_supports_store_level()
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            stock_join = """
                LEFT JOIN master_stock ms
                       ON ms.master_product_id = mp.master_product_id
            """
            params: list = []
            if store_scoped_stock:
                store_id_value = _require_store_id(store_id_value)
                stock_join += "                      AND ms.store_id = %s\n"
                params.append(store_id_value)
            query = (
                """
                SELECT mp.master_product_id,
                       mp.master_product_code,
                       mp.name,
                       mp.status,
                       COALESCE(ms.quantity_on_hand, 0) AS quantity_on_hand,
                       stp.cost_price
                FROM master_product mp
            """
                + stock_join
                + """
                LEFT JOIN store_type_price stp
                       ON stp.master_product_id = mp.master_product_id
                      AND stp.store_type = %s
                WHERE mp.status = 'ACTIVE'
            """
            )
            params.append(store_type)
            if keyword:
                query += " AND (mp.name LIKE %s OR mp.master_product_code LIKE %s)"
                like = f"%{keyword}%"
                params.extend([like, like])
            query += " ORDER BY mp.name"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return _convert_decimal_fields(rows, "cost_price")
    finally:
        conn.close()


def list_master_costs(
    keyword: str | None = None,
    master_product_id: int | None = None,
) -> list[dict]:
    """Return master products with both DIRECT and FRANCHISE cost prices."""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT mp.master_product_id,
                       mp.master_product_code,
                       mp.name,
                       COALESCE(MAX(CASE WHEN stp.store_type = 'DIRECT' THEN stp.cost_price END), NULL) AS direct_cost_price,
                       COALESCE(MAX(CASE WHEN stp.store_type = 'FRANCHISE' THEN stp.cost_price END), NULL) AS franchise_cost_price
                FROM master_product mp
                LEFT JOIN store_type_price stp ON stp.master_product_id = mp.master_product_id
            """
            params: list = []
            conditions: list[str] = []
            if master_product_id:
                conditions.append("mp.master_product_id = %s")
                params.append(master_product_id)
            if keyword:
                like = f"%{keyword}%"
                conditions.append("(mp.name LIKE %s OR mp.master_product_code LIKE %s)")
                params.extend([like, like])
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            query += " GROUP BY mp.master_product_id ORDER BY mp.name"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return _convert_decimal_fields(rows, "direct_cost_price", "franchise_cost_price")
    finally:
        conn.close()


def list_variants_for_outbound(store_id: int | str | None, keyword: str | None = None) -> list[dict]:
    store_id_value = _normalize_store_id(store_id)
    store_scoped_stock = _master_stock_supports_store_level()
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            stock_join = """
                LEFT JOIN master_stock ms
                       ON ms.master_product_id = mp.master_product_id
            """
            params: list = []
            if store_scoped_stock:
                store_id_value = _require_store_id(store_id_value)
                stock_join += "                      AND ms.store_id = %s\n"
                params.append(store_id_value)
            query = (
                """
                SELECT pv.variant_id,
                       pv.variant_code,
                       pv.display_name,
                       pv.sale_price,
                       mp.master_product_id,
                       mp.master_product_code,
                       mp.name AS master_name,
                       COALESCE(ms.quantity_on_hand, 0) AS quantity_on_hand
                FROM product_variant pv
                JOIN master_product mp ON mp.master_product_id = pv.master_product_id
            """
                + stock_join
                + """
                WHERE mp.status = 'ACTIVE' AND pv.status = 'ACTIVE'
            """
            )
            if keyword:
                like = f"%{keyword}%"
                query += " AND (pv.variant_code LIKE %s OR pv.display_name LIKE %s OR mp.name LIKE %s OR mp.master_product_code LIKE %s)"
                params.extend([like, like, like, like])
            query += " ORDER BY mp.name, pv.variant_code"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return _convert_decimal_fields(rows, "sale_price")
    finally:
        conn.close()


def list_master_stock_summary(store_id: int | str | None, keyword: str | None = None) -> list[dict]:
    store_id_value = _normalize_store_id(store_id)
    store_scoped_stock = _master_stock_supports_store_level()
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            store_columns = (
                "                       ms.store_id,\n                       s.store_name"
                if store_scoped_stock
                else "                       NULL AS store_id,\n                       NULL AS store_name"
            )
            stock_join = """
                LEFT JOIN master_stock ms
                       ON ms.master_product_id = mp.master_product_id
            """
            params: list = []
            store_join = ""
            if store_scoped_stock:
                store_id_value = _require_store_id(store_id_value)
                stock_join += "                      AND ms.store_id = %s\n"
                params.append(store_id_value)
                store_join = "                LEFT JOIN store s ON s.store_id = %s\n"
                params.append(store_id_value)
            query = (
                """
                SELECT mp.master_product_id,
                       mp.master_product_code,
                       mp.name,
                       mp.status,
                       COALESCE(ms.quantity_on_hand, 0) AS quantity_on_hand,
                       ms.updated_at,
            """
                + store_columns
                + "\n                FROM master_product mp\n"
                + stock_join
                + store_join
            )
            if keyword:
                like = f"%{keyword}%"
                query += " WHERE (mp.name LIKE %s OR mp.master_product_code LIKE %s)"
                params.extend([like, like])
            query += " ORDER BY mp.name"
            cursor.execute(query, params)
            return cursor.fetchall()
    finally:
        conn.close()


def list_variants_for_master(master_product_id: int) -> list[dict]:
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT pv.variant_id,
                       pv.variant_code,
                       pv.display_name,
                       pv.sale_price,
                       pv.status
                FROM product_variant pv
                WHERE pv.master_product_id = %s
                ORDER BY pv.variant_code
                """,
                (master_product_id,),
            )
            rows = cursor.fetchall()
            return _convert_decimal_fields(rows, "sale_price")
    finally:
        conn.close()


def receive_master_stock(
    master_product_id: int,
    quantity: int,
    store_id: int | None,
    staff_id: int | None,
    reference_no: str | None = None,
    note: str | None = None,
) -> dict:
    if quantity is None or int(quantity) <= 0:
        raise ValueError("進貨數量必須大於 0")
    qty = int(quantity)
    store_id_value = _normalize_store_id(store_id)
    store_scoped_stock = _master_stock_supports_store_level()
    if store_scoped_stock:
        store_id_value = _require_store_id(store_id_value)
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT master_product_id FROM master_product WHERE master_product_id = %s", (master_product_id,))
            if cursor.fetchone() is None:
                raise ValueError("找不到指定的主商品")

            select_query = (
                "SELECT quantity_on_hand FROM master_stock WHERE master_product_id = %s AND store_id = %s FOR UPDATE"
                if store_scoped_stock
                else "SELECT quantity_on_hand FROM master_stock WHERE master_product_id = %s FOR UPDATE"
            )
            select_params = (
                (master_product_id, store_id_value)
                if store_scoped_stock
                else (master_product_id,)
            )
            cursor.execute(select_query, select_params)
            row = cursor.fetchone()
            current_qty = row["quantity_on_hand"] if row else 0
            if row is None:
                if store_scoped_stock:
                    cursor.execute(
                        "INSERT INTO master_stock (master_product_id, store_id, quantity_on_hand) VALUES (%s, %s, 0)"
                        " ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand",
                        (master_product_id, store_id_value),
                    )
                else:
                    cursor.execute(
                        "INSERT INTO master_stock (master_product_id, quantity_on_hand) VALUES (%s, 0)"
                        " ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand",
                        (master_product_id,),
                    )
            if store_scoped_stock:
                update_query = (
                    "UPDATE master_stock SET quantity_on_hand = quantity_on_hand + %s, updated_at = NOW()"
                    " WHERE master_product_id = %s AND store_id = %s"
                )
                update_params = (qty, master_product_id, store_id_value)
            else:
                update_query = (
                    "UPDATE master_stock SET quantity_on_hand = quantity_on_hand + %s, updated_at = NOW()"
                    " WHERE master_product_id = %s"
                )
                update_params = (qty, master_product_id)
            cursor.execute(update_query, update_params)
            cursor.execute(
                """
                INSERT INTO stock_transaction (master_product_id, store_id, staff_id, txn_type, quantity, reference_no, note)
                VALUES (%s, %s, %s, 'INBOUND', %s, %s, %s)
                """,
                (master_product_id, store_id_value, staff_id, qty, reference_no, note),
            )
        conn.commit()
        return {
            "master_product_id": master_product_id,
            "store_id": store_id_value if store_scoped_stock else None,
            "quantity_on_hand": current_qty + qty,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def upsert_master_cost_price(
    master_product_id: int,
    store_type: str,
    cost_price: float | Decimal | str | int,
) -> dict:
    store_type = _normalize_store_type(store_type)
    if not master_product_id:
        raise ValueError("必須提供 master_product_id")
    try:
        price_value = float(cost_price)
    except (TypeError, ValueError):
        raise ValueError("請輸入正確的進貨價")
    if price_value < 0:
        raise ValueError("進貨價不能為負數")

    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT master_product_id FROM master_product WHERE master_product_id = %s",
                (master_product_id,),
            )
            if cursor.fetchone() is None:
                raise ValueError("找不到指定的主商品")

            cursor.execute(
                """
                INSERT INTO store_type_price (master_product_id, store_type, cost_price)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE cost_price = VALUES(cost_price)
                """,
                (master_product_id, store_type, price_value),
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {
        "master_product_id": master_product_id,
        "store_type": store_type,
        "cost_price": price_value,
    }


def ship_variant_stock(
    variant_id: int,
    quantity: int,
    store_id: int | None,
    staff_id: int | None,
    reference_no: str | None = None,
    note: str | None = None,
) -> dict:
    if quantity is None or int(quantity) <= 0:
        raise ValueError("出貨數量必須大於 0")
    qty = int(quantity)
    store_id_value = _normalize_store_id(store_id)
    store_scoped_stock = _master_stock_supports_store_level()
    if store_scoped_stock:
        store_id_value = _require_store_id(store_id_value)
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT master_product_id FROM product_variant WHERE variant_id = %s",
                (variant_id,),
            )
            variant = cursor.fetchone()
            if not variant:
                raise ValueError("找不到指定的尾碼商品")
            master_product_id = variant["master_product_id"]

            select_query = (
                "SELECT quantity_on_hand FROM master_stock WHERE master_product_id = %s AND store_id = %s FOR UPDATE"
                if store_scoped_stock
                else "SELECT quantity_on_hand FROM master_stock WHERE master_product_id = %s FOR UPDATE"
            )
            select_params = (
                (master_product_id, store_id_value)
                if store_scoped_stock
                else (master_product_id,)
            )
            cursor.execute(select_query, select_params)
            row = cursor.fetchone()
            current_qty = row["quantity_on_hand"] if row else 0
            if row is None:
                if store_scoped_stock:
                    cursor.execute(
                        "INSERT INTO master_stock (master_product_id, store_id, quantity_on_hand) VALUES (%s, %s, 0)"
                        " ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand",
                        (master_product_id, store_id_value),
                    )
                else:
                    cursor.execute(
                        "INSERT INTO master_stock (master_product_id, quantity_on_hand) VALUES (%s, 0)"
                        " ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand",
                        (master_product_id,),
                    )
            if current_qty < qty:
                raise ValueError(f"庫存不足，目前僅剩 {current_qty}")

            if store_scoped_stock:
                update_query = (
                    "UPDATE master_stock SET quantity_on_hand = quantity_on_hand - %s, updated_at = NOW()"
                    " WHERE master_product_id = %s AND store_id = %s"
                )
                update_params = (qty, master_product_id, store_id_value)
            else:
                update_query = (
                    "UPDATE master_stock SET quantity_on_hand = quantity_on_hand - %s, updated_at = NOW()"
                    " WHERE master_product_id = %s"
                )
                update_params = (qty, master_product_id)
            cursor.execute(update_query, update_params)
            cursor.execute(
                """
                INSERT INTO stock_transaction (master_product_id, variant_id, store_id, staff_id, txn_type, quantity, reference_no, note)
                VALUES (%s, %s, %s, %s, 'OUTBOUND', %s, %s, %s)
                """,
                (master_product_id, variant_id, store_id_value, staff_id, -qty, reference_no, note),
            )
        conn.commit()
        return {
            "master_product_id": master_product_id,
            "store_id": store_id_value if store_scoped_stock else None,
            "quantity_on_hand": current_qty - qty,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
