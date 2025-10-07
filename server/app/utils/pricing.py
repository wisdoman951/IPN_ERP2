"""Utility helpers for resolving member-specific pricing."""

from __future__ import annotations

import json
from typing import Iterable, Mapping

import pymysql
from pymysql.cursors import DictCursor

from app.config import DB_CONFIG


def resolve_member_prices(
    item_type: str,
    item_ids: Iterable[int],
    identity_type: str | None,
    store_id: int | None,
    *,
    quantity: int | None = None,
) -> Mapping[int, dict]:
    """Return the best matching member price for each item.

    Parameters
    ----------
    item_type:
        One of ``PRODUCT``, ``THERAPY``, ``PRODUCT_BUNDLE`` or ``THERAPY_BUNDLE``.
    item_ids:
        Iterable of item identifiers to resolve pricing for.
    identity_type:
        Member identity code. If ``None`` the function returns an empty mapping.
    store_id:
        Store identifier used to filter store-scoped price books. ``None`` means
        only globally applicable price books will be considered.
    quantity:
        Optional quantity hint. When provided the importer favours price book
        entries whose ``min_quantity`` is less than or equal to this value.
    """

    ids = [int(i) for i in item_ids if i is not None]
    if not ids or not identity_type:
        return {}

    placeholders = ",".join(["%s"] * len(ids))
    if not placeholders:
        return {}

    store_condition = "AND mpbs.store_id IS NULL"
    params: list[object] = [item_type, identity_type]
    if store_id is not None:
        store_condition = "AND (mpbs.store_id IS NULL OR mpbs.store_id = %s)"
        params.append(int(store_id))

    quantity_condition = ""
    if quantity is not None:
        quantity_condition = " AND (mpi.min_quantity IS NULL OR mpi.min_quantity <= %s)"
        params.append(int(quantity))

    params.extend(ids)

    query = f"""
        WITH price_candidates AS (
            SELECT
                mpi.item_id,
                mpi.price,
                mpi.custom_code,
                mpi.custom_name,
                mpi.metadata,
                mpi.currency,
                mpi.min_quantity,
                mpi.max_quantity,
                mpi.price_book_item_id,
                mpb.price_book_id,
                mpb.name AS price_book_name,
                ROW_NUMBER() OVER (
                    PARTITION BY mpi.item_id
                    ORDER BY mpb.priority ASC,
                             COALESCE(mpi.min_quantity, 0) DESC,
                             mpi.price_book_item_id ASC
                ) AS rn
            FROM member_price_book mpb
            JOIN member_price_book_item mpi ON mpb.price_book_id = mpi.price_book_id
            LEFT JOIN member_price_book_store mpbs ON mpb.price_book_id = mpbs.price_book_id
            WHERE mpi.item_type = %s
              AND mpb.status = 'ACTIVE'
              AND mpi.status = 'ACTIVE'
              AND (mpb.valid_from IS NULL OR mpb.valid_from <= CURRENT_DATE)
              AND (mpb.valid_to IS NULL OR mpb.valid_to >= CURRENT_DATE)
              AND mpb.identity_type = %s
              {store_condition}
              {quantity_condition}
              AND mpi.item_id IN ({placeholders})
        )
        SELECT
            item_id,
            price,
            custom_code,
            custom_name,
            metadata,
            currency,
            min_quantity,
            max_quantity,
            price_book_item_id,
            price_book_id,
            price_book_name
        FROM price_candidates
        WHERE rn = 1
    """

    connection = pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
    finally:
        connection.close()

    resolved: dict[int, dict] = {}
    for row in rows:
        metadata = row.get("metadata")
        if isinstance(metadata, str) and metadata.strip():
            try:
                row["metadata"] = json.loads(metadata)
            except json.JSONDecodeError:
                pass
        resolved[int(row["item_id"])] = row
    return resolved


__all__ = ["resolve_member_prices"]
