# app/models/product_bundle_model.py

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


def get_all_product_bundles(status: str | None = None, store_id: int | None = None, user_permission: str | None = None):
    """
    獲取所有產品組合列表。
    使用 GROUP_CONCAT 將每個組合的內容物（產品和療程名稱）合併成一個字串，
    以利前端直接顯示。
    會依據傳入的 store_id 過濾僅限於該分店可見的組合。
    """
    print(f"[DEBUG] get_all_product_bundles called with status={status}, store_id={store_id}")
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT
                    pb.bundle_id,
                    pb.bundle_code,
                    pb.name,
                    pb.selling_price,
                    pb.calculated_price,
                    pb.visible_store_ids,
                    pb.visible_permissions,
                    pb.created_at,
                    pb.status,
                    IFNULL(
                        GROUP_CONCAT(
                            CASE
                                WHEN pbi.item_type = 'Product' THEN CONCAT(p.name, ' x', pbi.quantity)
                                WHEN pbi.item_type = 'Therapy' THEN CONCAT(t.name, ' x', pbi.quantity)
                                ELSE NULL
                            END
                            SEPARATOR ', '
                        ),
                        ''
                    ) AS bundle_contents,
                    GROUP_CONCAT(DISTINCT c.name) AS categories,
                    COALESCE(
                        JSON_OBJECTAGG(
                            COALESCE(
                                NULLIF(pbpt.identity_type, ''),
                                CASE
                                    WHEN pbpt.price_tier_id IS NOT NULL THEN CONCAT('UNKNOWN_', pbpt.price_tier_id)
                                    ELSE CONCAT(
                                        'UNKNOWN_BUNDLE_',
                                        COALESCE(CAST(pbpt.bundle_id AS CHAR), CAST(pb.bundle_id AS CHAR), '0')
                                    )
                                END
                            ),
                            pbpt.price
                        ),
                        '{}'
                    ) AS price_tiers
                FROM
                    product_bundles pb
                LEFT JOIN
                    product_bundle_items pbi ON pb.bundle_id = pbi.bundle_id
                LEFT JOIN
                    product p ON pbi.item_id = p.product_id AND pbi.item_type = 'Product'
                LEFT JOIN
                    therapy t ON pbi.item_id = t.therapy_id AND pbi.item_type = 'Therapy'
                LEFT JOIN
                    product_bundle_category pbc ON pb.bundle_id = pbc.bundle_id
                LEFT JOIN
                    category c ON pbc.category_id = c.category_id
                LEFT JOIN
                    product_bundle_price_tier pbpt ON pb.bundle_id = pbpt.bundle_id AND pbpt.identity_type IS NOT NULL
            """
            params = []
            if status:
                query += " WHERE pb.status = %s"
                params.append(status)
            query += " GROUP BY pb.bundle_id ORDER BY pb.bundle_id DESC"
            cursor.execute(query, tuple(params))
            result = cursor.fetchall()

            # 將可見分店欄位統一轉換為整數列表，以便後續比對
            for row in result:
                raw_ids = row.get('visible_store_ids')
                permissions_raw = row.get('visible_permissions')
                print(f"[DEBUG] Bundle {row.get('bundle_id')} raw visible_store_ids={raw_ids}")
                if raw_ids in (None, ''):
                    row['visible_store_ids'] = []
                    print(f"[DEBUG] -> normalized visible_store_ids={row['visible_store_ids']}")
                else:
                    try:
                        # 若資料庫 driver 已自動解析為 list，直接使用
                        if isinstance(raw_ids, list):
                            parsed = raw_ids
                        # 若為單一整數或字串，轉為列表
                        elif isinstance(raw_ids, (int, str)):
                            parsed = json.loads(str(raw_ids))
                        else:
                            parsed = json.loads(raw_ids)

                        if isinstance(parsed, list):
                            row['visible_store_ids'] = [int(s) for s in parsed]
                        elif isinstance(parsed, (int, str)):
                            row['visible_store_ids'] = [int(parsed)]
                        else:
                            row['visible_store_ids'] = []
                        print(f"[DEBUG] -> normalized visible_store_ids={row['visible_store_ids']}")
                    except Exception as e:
                        row['visible_store_ids'] = []
                        print(f"[DEBUG] Failed to parse visible_store_ids for bundle {row.get('bundle_id')}: {e}")
                if permissions_raw in (None, ''):
                    row['visible_permissions'] = []
                else:
                    try:
                        if isinstance(permissions_raw, list):
                            row['visible_permissions'] = permissions_raw
                        elif isinstance(permissions_raw, str):
                            row['visible_permissions'] = json.loads(permissions_raw)
                            if isinstance(row['visible_permissions'], str):
                                row['visible_permissions'] = [row['visible_permissions']]
                        else:
                            parsed_permissions = json.loads(permissions_raw)
                            if isinstance(parsed_permissions, list):
                                row['visible_permissions'] = parsed_permissions
                            elif parsed_permissions in (None, ''):
                                row['visible_permissions'] = []
                            else:
                                row['visible_permissions'] = [parsed_permissions]
                    except Exception:
                        row['visible_permissions'] = []
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
                        or not row['visible_store_ids']
                        or store_id in row['visible_store_ids']
                    )
                    and _permission_is_allowed(row.get('visible_permissions'), user_permission)
                ]
                print(f"[DEBUG] Filtered bundle_ids for store_id={store_id}: {[row.get('bundle_id') for row in result]}")
            else:
                print(f"[DEBUG] Returning all bundles without store filter; count={len(result)}")
            return result
    finally:
        conn.close()

def create_product_bundle(data: dict):
    """新增一筆產品組合紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 步驟 1: 修改 SQL 語句，使用 %s 作為佔位符
            bundle_query = """
                INSERT INTO product_bundles (bundle_code, name, calculated_price, selling_price, visible_store_ids, visible_permissions, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'PUBLISHED')
            """
            # 步驟 2: 建立一個包含參數的元組 (tuple)，順序必須與 %s 對應
            bundle_values = (
                data['bundle_code'],
                data['name'],
                data.get('calculated_price'),
                data['selling_price'],
                json.dumps(data.get('visible_store_ids')) if data.get('visible_store_ids') is not None else None,
                json.dumps(data.get('visible_permissions')) if data.get('visible_permissions') is not None else None
            )
            # 步驟 3: 執行 SQL
            cursor.execute(bundle_query, bundle_values)
            bundle_id = conn.insert_id()

            # 步驟 4: 批量新增組合項目 (這部分邏輯不變)
            items = data.get('items', [])
            if items:
                item_query = """
                    INSERT INTO product_bundle_items (bundle_id, item_id, item_type, quantity)
                    VALUES (%s, %s, %s, %s)
                """
                item_values = [
                    (bundle_id, item['item_id'], item['item_type'], item.get('quantity', 1))
                    for item in items
                ]
                cursor.executemany(item_query, item_values)

            if "category_ids" in data:
                cursor.execute("DELETE FROM product_bundle_category WHERE bundle_id = %s", (bundle_id,))
                for cid in data.get("category_ids", []):
                    cursor.execute("INSERT INTO product_bundle_category (bundle_id, category_id) VALUES (%s, %s)", (bundle_id, cid))

            _sync_product_bundle_price_tiers(cursor, bundle_id, data.get("price_tiers"))
            conn.commit()
        return bundle_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# --- 未來可擴充的功能 ---

def get_bundle_details_by_id(bundle_id: int):
    """
    獲取單一組合的詳細資料，包含其下的所有項目，用於編輯。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 1. 獲取主組合資訊
            cursor.execute("SELECT * FROM product_bundles WHERE bundle_id = %s", (bundle_id,))
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

            # 2. 獲取該組合的所有項目
            cursor.execute("SELECT item_id, item_type, quantity FROM product_bundle_items WHERE bundle_id = %s", (bundle_id,))
            items = cursor.fetchall()

            cursor.execute(
                "SELECT c.category_id, c.name FROM product_bundle_category pbc JOIN category c ON pbc.category_id = c.category_id WHERE pbc.bundle_id = %s",
                (bundle_id,),
            )
            cats = cursor.fetchall()

            cursor.execute(
                "SELECT identity_type, price FROM product_bundle_price_tier WHERE bundle_id = %s",
                (bundle_id,),
            )
            tier_rows = cursor.fetchall()

            bundle_details['items'] = items
            bundle_details['category_ids'] = [c['category_id'] for c in cats]
            bundle_details['categories'] = [c['name'] for c in cats]
            bundle_details['price_tiers'] = {row['identity_type']: float(row['price']) for row in tier_rows}
            return bundle_details
    finally:
        conn.close()

def update_product_bundle(bundle_id: int, data: dict):
    """
    更新一個現有的產品組合。
    採用「先刪除舊項目，再新增新項目」的策略，最為簡單可靠。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 步驟 1: 更新主組合的資訊
            update_query = """
                UPDATE product_bundles SET
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

            # 步驟 2: 刪除此組合所有舊的項目
            cursor.execute("DELETE FROM product_bundle_items WHERE bundle_id = %s", (bundle_id,))

            # 步驟 3: 批量新增新的項目列表
            items = data.get('items', [])
            if items:
                item_query = """
                    INSERT INTO product_bundle_items (bundle_id, item_id, item_type, quantity)
                    VALUES (%s, %s, %s, %s)
                """
                item_values = [
                    (bundle_id, item['item_id'], item['item_type'], item.get('quantity', 1))
                    for item in items
                ]
                cursor.executemany(item_query, item_values)

            if "category_ids" in data:
                cursor.execute("DELETE FROM product_bundle_category WHERE bundle_id = %s", (bundle_id,))
                for cid in data.get("category_ids", []):
                    cursor.execute("INSERT INTO product_bundle_category (bundle_id, category_id) VALUES (%s, %s)", (bundle_id, cid))

            _sync_product_bundle_price_tiers(cursor, bundle_id, data.get("price_tiers"))
            conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def _sync_product_bundle_price_tiers(cursor, bundle_id: int, tiers: Iterable[dict] | None):
    cursor.execute("DELETE FROM product_bundle_price_tier WHERE bundle_id = %s", (bundle_id,))
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
            "INSERT INTO product_bundle_price_tier (bundle_id, identity_type, price) VALUES (%s, %s, %s)",
            values,
        )

def delete_product_bundle(bundle_id: int):
    """
    刪除一個產品組合。
    由於資料庫設定了外鍵的 ON DELETE CASCADE，關聯的項目會被自動刪除。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM product_bundles WHERE bundle_id = %s", (bundle_id,))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
