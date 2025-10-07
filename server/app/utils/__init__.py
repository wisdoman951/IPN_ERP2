"""Utility helpers for application-level shared logic."""

from __future__ import annotations

from flask import g

from .pricing import resolve_member_prices

__all__ = ["resolve_member_prices", "get_store_based_where_condition"]


def get_store_based_where_condition(table_alias: str | None = None) -> tuple[str, list[int]]:
    """Return a SQL where-clause fragment enforcing store-level access control.

    Historically this helper lived in :mod:`app.utils` as a plain module. When the
    pricing utilities were promoted into a package we accidentally shadowed the
    original module which meant imports like ``from app.utils import
    get_store_based_where_condition`` started failing. Re-exporting the helper
    here keeps backward compatibility while the rest of the application can start
    using the new package layout.

    Parameters
    ----------
    table_alias:
        Optional table alias used to qualify the ``store_id`` column. When not
        provided the raw column name is used.

    Returns
    -------
    tuple
        A tuple containing the SQL fragment and the accompanying parameter list
        that should be appended to the query being built.
    """

    if not hasattr(g, "user"):
        return (" AND 1=0 ", [])

    user_info = g.user
    permission = user_info.get("permission")
    store_id = user_info.get("store_id")

    if permission == "admin":
        return ("", [])

    if permission in ("basic", "therapist") and store_id:
        field = f"{table_alias}.store_id" if table_alias else "store_id"
        return (f" AND {field} = %s ", [store_id])

    return (" AND 1=0 ", [])
