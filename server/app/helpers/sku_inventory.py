"""Helpers for syncing inventory across SKUs that share the same product name."""
from __future__ import annotations

from typing import Dict, List, Optional

from pymysql.cursors import DictCursor


def _normalize_product_name(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    return value or None


def fetch_sku_group(
    cursor: DictCursor,
    *,
    product_name: Optional[str] = None,
    product_id: Optional[int] = None,
) -> List[Dict]:
    """Return all product rows that share the same name.

    The helper is intentionally lightweight and expects that callers already
    created the cursor/connection that should be reused.
    """

    if cursor is None:
        raise ValueError("cursor is required to fetch SKU information")

    normalized_name = _normalize_product_name(product_name)
    if normalized_name is None and product_id is None:
        raise ValueError("Either product_name or product_id must be provided")

    if normalized_name is None:
        cursor.execute("SELECT name FROM product WHERE product_id = %s", (product_id,))
        row = cursor.fetchone()
        if not row or not row.get("name"):
            raise ValueError(f"找不到指定產品 (ID: {product_id})")
        normalized_name = row["name"].strip()

    cursor.execute(
        """
        SELECT product_id, name
        FROM product
        WHERE name = %s
        ORDER BY product_id
        """,
        (normalized_name,),
    )
    products = cursor.fetchall() or []

    if not products:
        raise ValueError(f"找不到產品名稱 {normalized_name} 對應的 SKU")

    return products


def distribute_quantity(total_quantity: int, sku_count: int) -> List[int]:
    """Split a quantity evenly across *sku_count* buckets.

    Remainders are distributed to the first few buckets to ensure that the sum of
    all returned quantities always equals *total_quantity*. Negative quantities
    (stock out) are also supported.
    """

    if sku_count <= 0:
        raise ValueError("sku_count must be greater than zero")

    if total_quantity == 0:
        return [0 for _ in range(sku_count)]

    sign = 1 if total_quantity >= 0 else -1
    absolute = abs(total_quantity)
    base = absolute // sku_count
    remainder = absolute % sku_count

    distribution = [base for _ in range(sku_count)]
    for idx in range(remainder):
        distribution[idx] += 1

    return [sign * qty for qty in distribution]


def build_sku_quantity_plan(
    cursor: DictCursor,
    total_quantity: int,
    *,
    product_name: Optional[str] = None,
    product_id: Optional[int] = None,
) -> List[Dict[str, int]]:
    """Return a list of {product_id, quantity} plans for the provided total."""

    sku_group = fetch_sku_group(cursor, product_name=product_name, product_id=product_id)
    distribution = distribute_quantity(total_quantity, len(sku_group))
    plan: List[Dict[str, int]] = []
    for sku, quantity in zip(sku_group, distribution):
        plan.append({"product_id": sku["product_id"], "quantity": quantity})
    return plan
