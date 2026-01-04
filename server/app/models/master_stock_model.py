"""Master stock management helpers."""
from __future__ import annotations

from decimal import Decimal
from typing import Iterable, Callable, TypeVar

import pymysql
from pymysql.cursors import DictCursor

from app.config import DB_CONFIG

VALID_STORE_TYPES = {"DIRECT", "FRANCHISE"}
PRICE_TABLE_CANDIDATES: tuple[str, ...] = ("store_type_price", "stock_type_price")
PREFIX_LENGTH = 5
T = TypeVar("T")


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


def _normalize_name_for_prefix(value: str | None) -> str:
    return (value or "").strip().lower()


def _run_with_price_table(operation: Callable[[str], T]) -> T:
    """Execute DB operations that depend on the store-type price table name."""
    last_missing_table_error: pymysql.err.ProgrammingError | None = None
    for table_name in PRICE_TABLE_CANDIDATES:
        try:
            return operation(table_name)
        except pymysql.err.ProgrammingError as exc:
            is_missing_table = len(exc.args) > 0 and exc.args[0] == 1146
            if is_missing_table and table_name != PRICE_TABLE_CANDIDATES[-1]:
                last_missing_table_error = exc
                continue
            raise
    if last_missing_table_error:
        raise last_missing_table_error
    raise RuntimeError("price table operation failed without executing")


def _collect_prefix_family(cursor, inventory_item_id: int) -> tuple[list[dict], bool]:
    """Return inventory items sharing the same prefix and flag name conflicts."""

    cursor.execute(
        "SELECT inventory_item_id, inventory_code, name FROM inventory_items WHERE inventory_item_id = %s",
        (inventory_item_id,),
    )
    base = cursor.fetchone()
    if not base:
        return [], False

    prefix = (base.get("inventory_code") or "")[:PREFIX_LENGTH]
    if not prefix:
        return [base], False

    cursor.execute(
        "SELECT inventory_item_id, inventory_code, name FROM inventory_items WHERE inventory_code LIKE %s",
        (f"{prefix}%",),
    )
    family = cursor.fetchall() or []
    normalized_names = {
        _normalize_name_for_prefix(row.get("name")) for row in family if row.get("name")
    }
    has_conflict = len([n for n in normalized_names if n]) > 1
    return family, has_conflict


def _annotate_prefix_conflicts(rows: list[dict], merge_prefix: bool) -> list[dict]:
    grouped: dict[str, list[dict]] = {}
    for row in rows:
        prefix = (row.get("master_product_code") or "")[:PREFIX_LENGTH]
        key = prefix or str(row.get("inventory_item_id"))
        grouped.setdefault(key, []).append(dict(row))

    result: list[dict] = []
    for prefix, items in grouped.items():
        if len(items) == 1:
            result.append(items[0])
            continue

        normalized_names = {
            _normalize_name_for_prefix(item.get("name")) for item in items if item.get("name")
        }
        has_conflict = len([n for n in normalized_names if n]) > 1

        if merge_prefix and not has_conflict:
            merged = dict(items[0])
            merged["master_product_code"] = prefix
            merged["merged_inventory_item_ids"] = [i["inventory_item_id"] for i in items]
            merged["quantity_on_hand"] = sum(i.get("quantity_on_hand", 0) or 0 for i in items)
            result.append(merged)
            continue

        for item in items:
            item["prefix_conflict"] = has_conflict
            result.append(item)

    return result


def _resolve_inventory_item_id(
    cursor,
    *,
    master_product_id: int | None = None,
    variant_id: int | None = None,
    inventory_item_id: int | None = None,
) -> int:
    if inventory_item_id is not None:
        cursor.execute(
            "SELECT inventory_item_id FROM inventory_items WHERE inventory_item_id = %s",
            (inventory_item_id,),
        )
        row = cursor.fetchone()
        if row:
            return row["inventory_item_id"]

    if master_product_id is not None:
        cursor.execute(
            "SELECT inventory_item_id FROM master_product WHERE master_product_id = %s",
            (master_product_id,),
        )
        row = cursor.fetchone()
        if row and row.get("inventory_item_id"):
            return row["inventory_item_id"]

    if variant_id is not None:
        cursor.execute(
            """
            SELECT p.inventory_item_id
            FROM product_variant pv
            JOIN product p ON p.product_id = pv.variant_id
            WHERE pv.variant_id = %s
            """,
            (variant_id,),
        )
        row = cursor.fetchone()
        if row and row.get("inventory_item_id"):
            return row["inventory_item_id"]

        cursor.execute(
            """
            SELECT mp.inventory_item_id
            FROM product_variant pv
            JOIN master_product mp ON mp.master_product_id = pv.master_product_id
            WHERE pv.variant_id = %s
            """,
            (variant_id,),
        )
        row = cursor.fetchone()
        if row and row.get("inventory_item_id"):
            return row["inventory_item_id"]

    raise ValueError("無法推導 inventory_item_id，請確認商品設定")


def _resolve_master_product_id(
    cursor,
    *,
    master_product_id: int | None = None,
    inventory_item_id: int | None = None,
    variant_id: int | None = None,
) -> int:
    """Find a valid master_product_id for the given identifiers."""

    if master_product_id is not None:
        cursor.execute(
            "SELECT master_product_id FROM master_product WHERE master_product_id = %s",
            (master_product_id,),
        )
        row = cursor.fetchone()
        if row:
            return row["master_product_id"]
        raise ValueError("找不到對應的 master 商品，請確認 master_product_id")

    if variant_id is not None:
        cursor.execute(
            "SELECT master_product_id FROM product_variant WHERE variant_id = %s",
            (variant_id,),
        )
        row = cursor.fetchone()
        if row and row.get("master_product_id"):
            return row["master_product_id"]

    if inventory_item_id is not None:
        cursor.execute(
            "SELECT master_product_id FROM master_product WHERE inventory_item_id = %s",
            (inventory_item_id,),
        )
        row = cursor.fetchone()
        if row and row.get("master_product_id"):
            return row["master_product_id"]

    raise ValueError("找不到對應的 master 商品，請確認商品設定")


def list_master_products_for_inbound(
    store_type: str | None,
    store_id: int | str | None,
    keyword: str | None = None,
    merge_prefix: bool = False,
) -> list[dict]:
    """Return active inventory items with store-type-specific cost price."""
    store_type = _normalize_store_type(store_type)
    store_id_value = _normalize_store_id(store_id)
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            def _execute(price_table: str):
                query = f"""
                    SELECT ii.inventory_item_id,
                           ii.inventory_item_id AS master_product_id,
                           ii.inventory_code AS master_product_code,
                           ii.name,
                           ii.status,
                           COALESCE(ms.quantity_on_hand, 0) AS quantity_on_hand,
                           stp.cost_price
                    FROM inventory_items ii
                    LEFT JOIN master_stock ms
                           ON ms.inventory_item_id = ii.inventory_item_id
                          AND ms.store_id = %s
                    LEFT JOIN {price_table} stp
                           ON stp.inventory_item_id = ii.inventory_item_id
                          AND stp.store_type = %s
                    WHERE ii.status = 'ACTIVE'
                """
                params: list = [store_id_value, store_type]
                if keyword:
                    query += " AND (ii.name LIKE %s OR ii.inventory_code LIKE %s)"
                    like = f"%{keyword}%"
                    params.extend([like, like])
                query += " ORDER BY ii.name"
                cursor.execute(query, params)
                rows = cursor.fetchall()
                return _convert_decimal_fields(rows, "cost_price")

            rows = _run_with_price_table(_execute)
            return _annotate_prefix_conflicts(rows, merge_prefix)
    finally:
        conn.close()


def list_master_costs(
    keyword: str | None = None,
    master_product_id: int | None = None,
) -> list[dict]:
    """Return inventory items with both DIRECT and FRANCHISE cost prices."""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            def _execute(price_table: str):
                query = f"""
                    SELECT ii.inventory_item_id,
                           ii.inventory_item_id AS master_product_id,
                           ii.inventory_code AS master_product_code,
                           ii.name,
                           COALESCE(MAX(CASE WHEN stp.store_type = 'DIRECT' THEN stp.cost_price END), NULL) AS direct_cost_price,
                           COALESCE(MAX(CASE WHEN stp.store_type = 'FRANCHISE' THEN stp.cost_price END), NULL) AS franchise_cost_price
                    FROM inventory_items ii
                    LEFT JOIN {price_table} stp ON stp.inventory_item_id = ii.inventory_item_id
                """
                params: list = []
                conditions: list[str] = []
                if master_product_id:
                    conditions.append("ii.inventory_item_id = %s")
                    params.append(master_product_id)
                if keyword:
                    like = f"%{keyword}%"
                    conditions.append("(ii.name LIKE %s OR ii.inventory_code LIKE %s)")
                    params.extend([like, like])
                if conditions:
                    query += " WHERE " + " AND ".join(conditions)
                query += " GROUP BY ii.inventory_item_id ORDER BY ii.name"
                cursor.execute(query, params)
                rows = cursor.fetchall()
                return _convert_decimal_fields(rows, "direct_cost_price", "franchise_cost_price")

            return _run_with_price_table(_execute)
    finally:
        conn.close()


def list_variants_for_outbound(store_id: int | str | None, keyword: str | None = None) -> list[dict]:
    store_id_value = _normalize_store_id(store_id)
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT pv.variant_id,
                       pv.variant_code,
                       pv.display_name,
                       pv.sale_price,
                       ii.inventory_item_id AS master_product_id,
                       ii.inventory_code AS master_product_code,
                       ii.name AS master_name,
                       COALESCE(ms.quantity_on_hand, 0) AS quantity_on_hand
                FROM product_variant pv
                JOIN product p ON p.product_id = pv.variant_id
                JOIN inventory_items ii ON ii.inventory_item_id = p.inventory_item_id
                LEFT JOIN master_stock ms
                       ON ms.inventory_item_id = ii.inventory_item_id
                      AND ms.store_id = %s
                WHERE ii.status = 'ACTIVE' AND pv.status = 'ACTIVE'
            """
            params: list = [store_id_value]
            if keyword:
                like = f"%{keyword}%"
                query += " AND (pv.variant_code LIKE %s OR pv.display_name LIKE %s OR ii.name LIKE %s OR ii.inventory_code LIKE %s)"
                params.extend([like, like, like, like])
            query += " ORDER BY ii.name, pv.variant_code"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return _convert_decimal_fields(rows, "sale_price")
    finally:
        conn.close()


def list_master_stock_summary(store_id: int | str | None, keyword: str | None = None) -> list[dict]:
    store_id_value = _normalize_store_id(store_id)
    if store_id_value is None:
        raise ValueError("store_id is required when querying stock")
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT ii.inventory_item_id,
                       ii.inventory_code AS master_product_code,
                       ii.name,
                       ii.status,
                       COALESCE(ms.quantity_on_hand, 0) AS quantity_on_hand,
                       ms.updated_at,
                       s.store_id,
                       s.store_name
                FROM inventory_items ii
                LEFT JOIN master_stock ms
                       ON ms.inventory_item_id = ii.inventory_item_id
                      AND ms.store_id = %s
                LEFT JOIN store s ON s.store_id = %s
            """
            params: list = [store_id_value, store_id_value]
            if keyword:
                like = f"%{keyword}%"
                query += " WHERE (ii.name LIKE %s OR ii.inventory_code LIKE %s)"
                params.extend([like, like])
            query += " ORDER BY ii.name"
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
    master_product_id: int | None,
    quantity: int,
    store_id: int | None,
    staff_id: int | None,
    reference_no: str | None = None,
    note: str | None = None,
    variant_id: int | None = None,
    inventory_item_id: int | None = None,
    apply_prefix_bundle: bool = False,
) -> dict:
    if quantity is None or int(quantity) <= 0:
        raise ValueError("進貨數量必須大於 0")
    qty = int(quantity)
    store_id_value = _normalize_store_id(store_id)
    if store_id_value is None:
        raise ValueError("請提供有效的 store_id")
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            inventory_item_id = _resolve_inventory_item_id(
                cursor,
                master_product_id=master_product_id,
                variant_id=variant_id,
                inventory_item_id=inventory_item_id,
            )

            family_ids: list[int] = [inventory_item_id]
            if apply_prefix_bundle:
                family, has_conflict = _collect_prefix_family(cursor, inventory_item_id)
                if has_conflict:
                    raise ValueError("同前綴商品名稱不一致，請先確認是否要合併")
                family_ids = [row["inventory_item_id"] for row in family] or [inventory_item_id]

            results: list[dict] = []
            for inv_id in family_ids:
                resolved_master_id = _resolve_master_product_id(
                    cursor,
                    master_product_id=master_product_id,
                    inventory_item_id=inv_id,
                    variant_id=variant_id,
                )

                cursor.execute(
                    "SELECT quantity_on_hand FROM master_stock WHERE inventory_item_id = %s AND store_id = %s FOR UPDATE",
                    (inv_id, store_id_value),
                )
                row = cursor.fetchone()
                current_qty = row["quantity_on_hand"] if row else 0
                if row is None:
                    cursor.execute(
                        """
                        INSERT INTO master_stock (inventory_item_id, master_product_id, store_id, quantity_on_hand)
                        VALUES (%s, %s, %s, 0)
                        ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand
                        """,
                        (inv_id, resolved_master_id, store_id_value),
                    )
                cursor.execute(
                    "UPDATE master_stock SET quantity_on_hand = quantity_on_hand + %s, master_product_id = %s, updated_at = NOW()"
                    " WHERE inventory_item_id = %s AND store_id = %s",
                    (qty, resolved_master_id, inv_id, store_id_value),
                )
                cursor.execute(
                    """
                    INSERT INTO stock_transaction (master_product_id, inventory_item_id, store_id, staff_id, txn_type, quantity, reference_no, note)
                    VALUES (%s, %s, %s, %s, 'INBOUND', %s, %s, %s)
                    """,
                    (resolved_master_id, inv_id, store_id_value, staff_id, qty, reference_no, note),
                )

                results.append(
                    {
                        "master_product_id": resolved_master_id,
                        "inventory_item_id": inv_id,
                        "store_id": store_id_value,
                        "quantity_on_hand": current_qty + qty,
                    }
                )
        conn.commit()
        if len(results) == 1:
            return results[0]
        return {"bundled": results}
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
            inventory_item_id = _resolve_inventory_item_id(cursor, master_product_id=master_product_id)

            def _execute(price_table: str):
                cursor.execute(
                    f"""
                    INSERT INTO {price_table} (master_product_id, inventory_item_id, store_type, cost_price)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE cost_price = VALUES(cost_price), inventory_item_id = VALUES(inventory_item_id)
                    """,
                    (master_product_id, inventory_item_id, store_type, price_value),
                )

            _run_with_price_table(_execute)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {
        "master_product_id": master_product_id,
        "inventory_item_id": inventory_item_id,
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
    if store_id_value is None:
        raise ValueError("請提供有效的 store_id")
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            inventory_item_id = _resolve_inventory_item_id(cursor, variant_id=variant_id)
            cursor.execute(
                """
                SELECT master_product_id
                FROM product_variant
                WHERE variant_id = %s
                """,
                (variant_id,),
            )
            variant = cursor.fetchone() or {}
            master_product_id = variant.get("master_product_id")

            cursor.execute(
                "SELECT quantity_on_hand FROM master_stock WHERE inventory_item_id = %s AND store_id = %s FOR UPDATE",
                (inventory_item_id, store_id_value),
            )
            row = cursor.fetchone()
            current_qty = row["quantity_on_hand"] if row else 0
            if row is None:
                cursor.execute(
                    """
                    INSERT INTO master_stock (inventory_item_id, master_product_id, store_id, quantity_on_hand)
                    VALUES (%s, %s, %s, 0)
                    ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand
                    """,
                    (inventory_item_id, master_product_id, store_id_value),
                )
            if current_qty < qty:
                raise ValueError(f"庫存不足，目前僅剩 {current_qty}")

            cursor.execute(
                "UPDATE master_stock SET quantity_on_hand = quantity_on_hand - %s, master_product_id = %s, updated_at = NOW()"
                " WHERE inventory_item_id = %s AND store_id = %s",
                (qty, master_product_id, inventory_item_id, store_id_value),
            )
            cursor.execute(
                """
                INSERT INTO stock_transaction (master_product_id, inventory_item_id, variant_id, store_id, staff_id, txn_type, quantity, reference_no, note)
                VALUES (%s, %s, %s, %s, %s, 'OUTBOUND', %s, %s, %s)
                """,
                (master_product_id, inventory_item_id, variant_id, store_id_value, staff_id, -qty, reference_no, note),
            )
        conn.commit()
        return {
            "master_product_id": master_product_id,
            "inventory_item_id": inventory_item_id,
            "store_id": store_id_value,
            "quantity_on_hand": current_qty - qty,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
