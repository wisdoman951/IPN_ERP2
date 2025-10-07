import pymysql
import json
from typing import Iterable
from app.config import DB_CONFIG
from pymysql.cursors import DictCursor


def connect_to_db():
    """建立資料庫連線"""
    return pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)


def _permission_is_allowed(allowed_permissions, user_permission):
    if user_permission is None or not allowed_permissions:
        return True
    if isinstance(allowed_permissions, list):
        return user_permission in allowed_permissions
    return user_permission == allowed_permissions


def get_all_therapy_bundles(status: str | None = None, store_id: int | None = None, user_permission: str | None = None):
    """獲取所有療程組合列表"""
    print(f"[DEBUG] get_all_therapy_bundles called with status={status}, store_id={store_id}")
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT
                    tb.bundle_id,
                    tb.bundle_code,
                    tb.name,
                    tb.selling_price,
                    tb.calculated_price,
                    tb.visible_store_ids,
                    tb.visible_permissions,
                    tb.created_at,
                    tb.status,
                    IFNULL(
                        GROUP_CONCAT(
                            CONCAT(t.name, ' x', tbi.quantity)
                            SEPARATOR ', '
                        ),
                        ''
                    ) AS bundle_contents,
                    GROUP_CONCAT(DISTINCT c.name) AS categories,
                    COALESCE(
                        JSON_OBJECTAGG(
                            COALESCE(
                                NULLIF(tbpt.identity_type, ''),
                                CASE
                                    WHEN tbpt.price_tier_id IS NOT NULL THEN CONCAT('UNKNOWN_', tbpt.price_tier_id)
                                    ELSE CONCAT('UNKNOWN_BUNDLE_', CAST(tb.bundle_id AS CHAR))
                                END
                            ),
                            tbpt.price
                        ),
                        '{}'
                    ) AS price_tiers
                FROM
                    therapy_bundles tb
                LEFT JOIN
                    therapy_bundle_items tbi ON tb.bundle_id = tbi.bundle_id
                LEFT JOIN
                    therapy t ON tbi.item_id = t.therapy_id
                LEFT JOIN
                    therapy_bundle_category tbc ON tb.bundle_id = tbc.bundle_id
                LEFT JOIN
                    category c ON tbc.category_id = c.category_id
                LEFT JOIN
                    therapy_bundle_price_tier tbpt ON tb.bundle_id = tbpt.bundle_id AND tbpt.identity_type IS NOT NULL
            """
            params = []
            if status:
                query += " WHERE tb.status = %s"
                params.append(status)
            query += " GROUP BY tb.bundle_id, tb.visible_permissions ORDER BY tb.bundle_id DESC"
            cursor.execute(query, tuple(params))
            result = cursor.fetchall()
            # 解析每筆資料中的可見門市 ID，統一為整數列表
            for row in result:
                raw_ids = row.get("visible_store_ids")
                permissions_raw = row.get("visible_permissions")
                print(f"[DEBUG] Bundle {row.get('bundle_id')} raw visible_store_ids={raw_ids}")
                if raw_ids in (None, ''):
                    row["visible_store_ids"] = []
                    print(f"[DEBUG] -> normalized visible_store_ids={row['visible_store_ids']}")
                else:
                    try:
                        if isinstance(raw_ids, list):
                            parsed = raw_ids
                        elif isinstance(raw_ids, (int, str)):
                            parsed = json.loads(str(raw_ids))
                        else:
                            parsed = json.loads(raw_ids)

                        if isinstance(parsed, list):
                            row["visible_store_ids"] = [int(s) for s in parsed]
                        elif isinstance(parsed, (int, str)):
                            row["visible_store_ids"] = [int(parsed)]
                        else:
                            row["visible_store_ids"] = []
                        print(f"[DEBUG] -> normalized visible_store_ids={row['visible_store_ids']}")
                    except Exception as e:
                        row["visible_store_ids"] = []
                        print(f"[DEBUG] Failed to parse visible_store_ids for bundle {row.get('bundle_id')}: {e}")
                if permissions_raw in (None, ''):
                    row["visible_permissions"] = []
                else:
                    try:
                        if isinstance(permissions_raw, list):
                            row["visible_permissions"] = permissions_raw
                        elif isinstance(permissions_raw, str):
                            row["visible_permissions"] = json.loads(permissions_raw)
                            if isinstance(row["visible_permissions"], str):
                                row["visible_permissions"] = [row["visible_permissions"]]
                        else:
                            parsed_permissions = json.loads(permissions_raw)
                            if isinstance(parsed_permissions, list):
                                row["visible_permissions"] = parsed_permissions
                            elif parsed_permissions in (None, ''):
                                row["visible_permissions"] = []
                            else:
                                row["visible_permissions"] = [parsed_permissions]
                    except Exception:
                        row["visible_permissions"] = []
                if row.get('categories'):
                    row['categories'] = row['categories'].split(',')
                if row.get('price_tiers'):
                    try:
                        row['price_tiers'] = json.loads(row['price_tiers'])
                    except Exception:
                        row['price_tiers'] = None
                if row.get('price_tiers') is None:
                    row['price_tiers'] = {}
            if store_id is not None or user_permission is not None:
                result = [
                    row
                    for row in result
                    if (
                        store_id is None
                        or not row.get("visible_store_ids")
                        or store_id in row["visible_store_ids"]
                    )
                    and _permission_is_allowed(row.get("visible_permissions"), user_permission)
                ]
                print(f"[DEBUG] Filtered bundle_ids for store_id={store_id}: {[row.get('bundle_id') for row in result]}")
            else:
                print(f"[DEBUG] Returning all bundles without store filter; count={len(result)}")
            return result
    finally:
        conn.close()


def create_therapy_bundle(data: dict):
    """新增一筆療程組合紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            bundle_query = """
                INSERT INTO therapy_bundles (bundle_code, name, calculated_price, selling_price, visible_store_ids, visible_permissions, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'PUBLISHED')
            """
            bundle_values = (
                data['bundle_code'],
                data['name'],
                data.get('calculated_price'),
                data['selling_price'],
                json.dumps(data.get('visible_store_ids')) if data.get('visible_store_ids') is not None else None,
                json.dumps(data.get('visible_permissions')) if data.get('visible_permissions') is not None else None
            )
            cursor.execute(bundle_query, bundle_values)
            bundle_id = conn.insert_id()

            items = data.get('items', [])
            if items:
                item_query = """
                    INSERT INTO therapy_bundle_items (bundle_id, item_id, quantity)
                    VALUES (%s, %s, %s)
                """
                item_values = [
                    (bundle_id, item['item_id'], item.get('quantity', 1))
                    for item in items
                ]
                cursor.executemany(item_query, item_values)

            for cid in data.get('category_ids', []):
                cursor.execute(
                    "INSERT INTO therapy_bundle_category (bundle_id, category_id) VALUES (%s, %s)",
                    (bundle_id, cid),
                )

            _sync_therapy_bundle_price_tiers(cursor, bundle_id, data.get("price_tiers"))

        conn.commit()
        return bundle_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_bundle_details_by_id(bundle_id: int):
    """獲取單一療程組合詳細資料"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM therapy_bundles WHERE bundle_id = %s", (bundle_id,))
            bundle_details = cursor.fetchone()
            if not bundle_details:
                return None
            if bundle_details.get('visible_store_ids'):
                try:
                    bundle_details['visible_store_ids'] = json.loads(bundle_details['visible_store_ids'])
                except Exception:
                    pass
            if bundle_details.get('visible_permissions'):
                try:
                    parsed_permissions = json.loads(bundle_details['visible_permissions'])
                    if isinstance(parsed_permissions, str):
                        parsed_permissions = [parsed_permissions]
                    bundle_details['visible_permissions'] = parsed_permissions
                except Exception:
                    pass
            cursor.execute("SELECT item_id, quantity FROM therapy_bundle_items WHERE bundle_id = %s", (bundle_id,))
            items = cursor.fetchall()
            cursor.execute("SELECT c.category_id, c.name FROM therapy_bundle_category tbc JOIN category c ON tbc.category_id = c.category_id WHERE tbc.bundle_id = %s", (bundle_id,))
            cats = cursor.fetchall()
            cursor.execute("SELECT identity_type, price FROM therapy_bundle_price_tier WHERE bundle_id = %s", (bundle_id,))
            tier_rows = cursor.fetchall()
            bundle_details['items'] = items
            bundle_details['category_ids'] = [c['category_id'] for c in cats]
            bundle_details['categories'] = [c['name'] for c in cats]
            bundle_details['price_tiers'] = {row['identity_type']: float(row['price']) for row in tier_rows}
            return bundle_details
    finally:
        conn.close()


def update_therapy_bundle(bundle_id: int, data: dict):
    """更新一個療程組合"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            update_query = """
                UPDATE therapy_bundles SET
                    bundle_code = %s,
                    name = %s,
                    calculated_price = %s,
                    selling_price = %s,
                    visible_store_ids = %s,
                    visible_permissions = %s
                WHERE bundle_id = %s
            """
            update_values = (
                data['bundle_code'], data['name'],
                data.get('calculated_price'), data['selling_price'],
                json.dumps(data.get('visible_store_ids')) if data.get('visible_store_ids') is not None else None,
                json.dumps(data.get('visible_permissions')) if data.get('visible_permissions') is not None else None,
                bundle_id
            )
            cursor.execute(update_query, update_values)

            cursor.execute("DELETE FROM therapy_bundle_items WHERE bundle_id = %s", (bundle_id,))

            items = data.get('items', [])
            if items:
                item_query = """
                    INSERT INTO therapy_bundle_items (bundle_id, item_id, quantity)
                    VALUES (%s, %s, %s)
                """
                item_values = [
                    (bundle_id, item['item_id'], item.get('quantity', 1))
                    for item in items
                ]
                cursor.executemany(item_query, item_values)

            if "category_ids" in data:
                cursor.execute("DELETE FROM therapy_bundle_category WHERE bundle_id = %s", (bundle_id,))
                for cid in data.get("category_ids", []):
                    cursor.execute(
                        "INSERT INTO therapy_bundle_category (bundle_id, category_id) VALUES (%s, %s)",
                        (bundle_id, cid),
                    )

            _sync_therapy_bundle_price_tiers(cursor, bundle_id, data.get("price_tiers"))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def _sync_therapy_bundle_price_tiers(cursor, bundle_id: int, tiers: Iterable[dict] | None):
    cursor.execute("DELETE FROM therapy_bundle_price_tier WHERE bundle_id = %s", (bundle_id,))
    if not tiers:
        return

    values = []
    for tier in tiers:
        identity = tier.get("identity_type")
        price = tier.get("price")
        if identity is None or price is None:
            continue
        values.append((bundle_id, identity, price))

    if values:
        cursor.executemany(
            "INSERT INTO therapy_bundle_price_tier (bundle_id, identity_type, price) VALUES (%s, %s, %s)",
            values,
        )


def delete_therapy_bundle(bundle_id: int):
    """刪除一個療程組合"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM therapy_bundles WHERE bundle_id = %s", (bundle_id,))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
