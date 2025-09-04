import pymysql
import json
from app.config import DB_CONFIG
from pymysql.cursors import DictCursor


def connect_to_db():
    """建立資料庫連線"""
    return pymysql.connect(**DB_CONFIG, cursorclass=DictCursor)


def get_all_therapy_bundles(status: str | None = None, store_id: int | None = None):
    """獲取所有療程組合列表"""
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
                    tb.created_at,
                    tb.status,
                    IFNULL(
                        GROUP_CONCAT(
                            CONCAT(t.name, ' x', tbi.quantity)
                            SEPARATOR ', '
                        ),
                        ''
                    ) AS bundle_contents
                FROM
                    therapy_bundles tb
                LEFT JOIN
                    therapy_bundle_items tbi ON tb.bundle_id = tbi.bundle_id
                LEFT JOIN
                    therapy t ON tbi.item_id = t.therapy_id
            """
            params = []
            if status:
                query += " WHERE tb.status = %s"
                params.append(status)
            query += " GROUP BY tb.bundle_id ORDER BY tb.bundle_id DESC"
            cursor.execute(query, tuple(params))
            result = cursor.fetchall()
            # 解析每筆資料中的可見門市 ID，使其成為整數列表以便後續篩選
            for row in result:
                if row.get("visible_store_ids"):
                    try:
                        store_ids = json.loads(row["visible_store_ids"])
                        if isinstance(store_ids, (int, str)):
                            store_ids = [int(store_ids)]
                        row["visible_store_ids"] = store_ids
                    except Exception:
                        row["visible_store_ids"] = None
                else:
                    row["visible_store_ids"] = None

            if store_id is not None:
                result = [
                    row
                    for row in result
                    if not row.get("visible_store_ids")
                    or store_id in row["visible_store_ids"]
                ]
            return result
    finally:
        conn.close()


def create_therapy_bundle(data: dict):
    """新增一筆療程組合紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            bundle_query = """
                INSERT INTO therapy_bundles (bundle_code, name, calculated_price, selling_price, visible_store_ids, status)
                VALUES (%s, %s, %s, %s, %s, 'PUBLISHED')
            """
            bundle_values = (
                data['bundle_code'],
                data['name'],
                data.get('calculated_price'),
                data['selling_price'],
                json.dumps(data.get('visible_store_ids')) if data.get('visible_store_ids') is not None else None
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

            cursor.execute(
                "SELECT item_id, quantity FROM therapy_bundle_items WHERE bundle_id = %s",
                (bundle_id,)
            )
            items = cursor.fetchall()
            bundle_details['items'] = items
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
                    visible_store_ids = %s
                WHERE bundle_id = %s
            """
            update_values = (
                data['bundle_code'], data['name'],
                data.get('calculated_price'), data['selling_price'],
                json.dumps(data.get('visible_store_ids')) if data.get('visible_store_ids') is not None else None,
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

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


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
