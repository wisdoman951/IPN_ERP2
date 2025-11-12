# server\app\models\therapy_sell_model.py
import pymysql
from app.config import DB_CONFIG
from datetime import datetime
import traceback
import logging
import json
import re


ORDER_META_PATTERN = re.compile(r"\[\[order_meta\s+({.*?})\]\]", re.IGNORECASE)
BUNDLE_META_PATTERN = re.compile(r"\[\[bundle_meta\s+({.*?})\]\]", re.IGNORECASE)
BUNDLE_TAG_PATTERN = re.compile(r"\[bundle:([^\]]+)\]", re.IGNORECASE)


def _safe_float(value):
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _strip_metadata_from_note(note: str | None) -> str:
    if not note:
        return ""
    cleaned = ORDER_META_PATTERN.sub("", note)
    cleaned = BUNDLE_META_PATTERN.sub("", cleaned)
    cleaned = BUNDLE_TAG_PATTERN.sub("", cleaned)
    return cleaned.strip()


def _build_note(note: str | None, order_group_key: str | None = None, bundle_id: int | None = None) -> str:
    base_note = _strip_metadata_from_note(note)
    parts: list[str] = []
    if base_note:
        parts.append(base_note)
    if order_group_key:
        try:
            meta_json = json.dumps({"group": order_group_key}, ensure_ascii=False)
        except (TypeError, ValueError):
            meta_json = json.dumps({"group": str(order_group_key)}, ensure_ascii=False)
        parts.append(f"[[order_meta {meta_json}]]")
    if bundle_id:
        parts.append(f"[bundle:{bundle_id}]")
    return " ".join(part for part in parts if part).strip()


def _extract_order_group_key(note: str | None) -> str | None:
    if not note:
        return None
    match = ORDER_META_PATTERN.search(note)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(1))
        if isinstance(parsed, dict):
            group = parsed.get("group")
            if isinstance(group, str) and group.strip():
                return group
    except Exception:
        return None
    return None


def _extract_bundle_id_from_note(note: str | None) -> int | None:
    if not note:
        return None
    match = BUNDLE_TAG_PATTERN.search(note)
    if not match:
        return None
    try:
        return int(match.group(1))
    except (TypeError, ValueError):
        return None


def connect_to_db():
    """連接到數據庫"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

def get_all_therapy_packages(status: str | None = 'PUBLISHED', store_id: int | None = None):
    """獲取所有療程套餐"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT t.therapy_id, t.code AS TherapyCode, t.price AS TherapyPrice,
                       t.name AS TherapyName, t.content AS TherapyContent,
                       t.visible_store_ids, GROUP_CONCAT(c.name) AS categories,
                       COALESCE(
                           JSON_OBJECTAGG(
                               COALESCE(
                                   NULLIF(tpt.identity_type, ''),
                                   CASE
                                       WHEN tpt.price_tier_id IS NOT NULL THEN CONCAT('UNKNOWN_', tpt.price_tier_id)
                                       ELSE CONCAT('UNKNOWN_TIER_', CAST(t.therapy_id AS CHAR))
                                   END
                               ),
                               tpt.price
                           ),
                           '{}'
                       ) AS price_tiers
                FROM therapy t
                LEFT JOIN therapy_category tc ON t.therapy_id = tc.therapy_id
                LEFT JOIN category c ON tc.category_id = c.category_id
                LEFT JOIN therapy_price_tier tpt ON tpt.therapy_id = t.therapy_id AND tpt.identity_type IS NOT NULL
            """
            params = []
            if status:
                query += " WHERE t.status = %s"
                params.append(status)
            query += " GROUP BY t.therapy_id, t.code, t.price, t.name, t.content, t.visible_store_ids ORDER BY t.code"
            cursor.execute(query, tuple(params))
            result = cursor.fetchall()
            filtered = []
            for row in result:
                store_ids = None
                if row.get('visible_store_ids'):
                    try:
                        store_ids = json.loads(row['visible_store_ids'])
                        if isinstance(store_ids, (int, str)):
                            store_ids = [int(store_ids)]
                    except Exception:
                        store_ids = None
                if store_id is None or not store_ids or int(store_id) in store_ids:
                    row.pop('visible_store_ids', None)
                    if row.get('categories'):
                        row['categories'] = row['categories'].split(',')
                    if row.get('price_tiers'):
                        try:
                            parsed = json.loads(row['price_tiers'])
                            row['price_tiers'] = {
                                key: float(value) for key, value in parsed.items() if value is not None
                            }
                        except Exception:
                            row['price_tiers'] = {}
                    else:
                        row['price_tiers'] = {}
                    filtered.append(row)
            return filtered
    except Exception as e:
        print(f"獲取療程套餐錯誤: {e}")
        return {"error": str(e)}
    finally:
        conn.close()

def search_therapy_packages(keyword, status: str | None = 'PUBLISHED', store_id: int | None = None):
    """搜尋療程套餐"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT t.therapy_id, t.code AS TherapyCode, t.price AS TherapyPrice,
                       t.name AS TherapyName, t.content AS TherapyContent,
                       t.visible_store_ids, GROUP_CONCAT(c.name) AS categories,
                       COALESCE(
                           JSON_OBJECTAGG(
                               COALESCE(
                                   NULLIF(tpt.identity_type, ''),
                                   CASE
                                       WHEN tpt.price_tier_id IS NOT NULL THEN CONCAT('UNKNOWN_', tpt.price_tier_id)
                                       ELSE CONCAT('UNKNOWN_TIER_', CAST(t.therapy_id AS CHAR))
                                   END
                               ),
                               tpt.price
                           ),
                           '{}'
                       ) AS price_tiers
                FROM therapy t
                LEFT JOIN therapy_category tc ON t.therapy_id = tc.therapy_id
                LEFT JOIN category c ON tc.category_id = c.category_id
                LEFT JOIN therapy_price_tier tpt ON tpt.therapy_id = t.therapy_id AND tpt.identity_type IS NOT NULL
                WHERE (t.code LIKE %s OR t.name LIKE %s OR t.content LIKE %s)
            """
            params = []
            like = f"%{keyword}%"
            params.extend([like, like, like])
            if status:
                query += " AND t.status = %s"
                params.append(status)
            query += " GROUP BY t.therapy_id, t.code, t.price, t.name, t.content, t.visible_store_ids ORDER BY t.code"
            cursor.execute(query, tuple(params))
            result = cursor.fetchall()
            filtered = []
            for row in result:
                store_ids = None
                if row.get('visible_store_ids'):
                    try:
                        store_ids = json.loads(row['visible_store_ids'])
                        if isinstance(store_ids, (int, str)):
                            store_ids = [int(store_ids)]
                    except Exception:
                        store_ids = None
                if store_id is None or not store_ids or int(store_id) in store_ids:
                    row.pop('visible_store_ids', None)
                    if row.get('categories'):
                        row['categories'] = row['categories'].split(',')
                    if row.get('price_tiers'):
                        try:
                            parsed = json.loads(row['price_tiers'])
                            row['price_tiers'] = {
                                key: float(value) for key, value in parsed.items() if value is not None
                            }
                        except Exception:
                            row['price_tiers'] = {}
                    else:
                        row['price_tiers'] = {}
                    filtered.append(row)
            return filtered
    except Exception as e:
        print(f"搜尋療程套餐錯誤: {e}")
        return {"error": str(e)}
    finally:
        conn.close()

def get_all_therapy_sells(store_id=None):
    """獲取所有療程銷售紀錄"""
    print("--- store_id:", store_id, type(store_id))
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 這段 SQL 查詢是您檔案中原有的，我們保持不變
            query = """
                SELECT ts.therapy_sell_id as Order_ID,
                       m.member_id as Member_ID,
                       m.member_code as MemberCode,
                       m.name as MemberName,
                       ts.date as PurchaseDate,
                       COALESCE(t.name, ts.therapy_name) as PackageName,
                       t.code as TherapyCode,
                       ts.amount as Sessions,
                       ts.final_price as Price,
                       ts.payment_method as PaymentMethod,
                       s.name as StaffName,
                       ts.sale_category as SaleCategory,
                       t.price as UnitPrice,
                       ts.note as Note,
                       ts.staff_id as Staff_ID,
                       st.store_name as store_name,
                       ts.store_id as store_id,
                       ts.therapy_id as therapy_id,
                       ts.note
                FROM therapy_sell ts
                LEFT JOIN member m ON ts.member_id = m.member_id
                LEFT JOIN staff s ON ts.staff_id = s.staff_id
                LEFT JOIN store st ON ts.store_id = st.store_id
                LEFT JOIN therapy t ON ts.therapy_id = t.therapy_id
            """
            
            if store_id:
                query += " WHERE ts.store_id = %s"
                query += (
                    " ORDER BY"
                    " (COALESCE(NULLIF(st.store_name, ''), CAST(ts.store_id AS CHAR)) = ''),"
                    " COALESCE(NULLIF(st.store_name, ''), CAST(ts.store_id AS CHAR)),"
                    " (COALESCE(NULLIF(m.member_code, ''), '') = ''),"
                    " CHAR_LENGTH(COALESCE(NULLIF(m.member_code, ''), '')),"
                    " COALESCE(NULLIF(m.member_code, ''), ''),"
                    " ts.date DESC"
                )
                cursor.execute(query, (store_id,))
            else:
                query += (
                    " ORDER BY"
                    " (COALESCE(NULLIF(st.store_name, ''), CAST(ts.store_id AS CHAR)) = ''),"
                    " COALESCE(NULLIF(st.store_name, ''), CAST(ts.store_id AS CHAR)),"
                    " (COALESCE(NULLIF(m.member_code, ''), '') = ''),"
                    " CHAR_LENGTH(COALESCE(NULLIF(m.member_code, ''), '')),"
                    " COALESCE(NULLIF(m.member_code, ''), ''),"
                    " ts.date DESC"
                )
                cursor.execute(query)
                
            result = cursor.fetchall()

            for record in result:
                if record.get('PurchaseDate'):
                    date_obj = record['PurchaseDate']
                    if isinstance(date_obj, datetime):
                        # 將日期格式化為西元年
                        record['PurchaseDate'] = f"{date_obj.year}/{date_obj.month:02d}/{date_obj.day:02d}"
                record['order_group_key'] = _extract_order_group_key(record.get('note') or record.get('Note'))

            return result
    except Exception as e:
        print(f"獲取療程銷售記錄錯誤: {e}")
        return {"error": str(e)}
    finally:
        conn.close()

def search_therapy_sells(keyword, store_id=None):
    """搜尋療程銷售紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT ts.therapy_sell_id as Order_ID,
                       m.member_id as Member_ID,
                       m.member_code as MemberCode,
                       m.name as MemberName,
                       ts.date as PurchaseDate,
                       COALESCE(t.name, ts.therapy_name) as PackageName,
                       t.code as TherapyCode,
                       ts.amount as Sessions,
                       ts.final_price as Price,
                       ts.payment_method as PaymentMethod,
                       s.name as StaffName,
                       ts.sale_category as SaleCategory,
                       t.price as UnitPrice,
                       ts.staff_id as Staff_ID,
                       st.store_name as store_name,
                       ts.store_id as store_id,
                       ts.therapy_id as therapy_id,
                       ts.note
                FROM therapy_sell ts
                LEFT JOIN member m ON ts.member_id = m.member_id
                LEFT JOIN staff s ON ts.staff_id = s.staff_id
                LEFT JOIN store st ON ts.store_id = st.store_id
                LEFT JOIN therapy t ON ts.therapy_id = t.therapy_id
                WHERE (m.name LIKE %s OR m.member_code LIKE %s OR s.name LIKE %s)
            """
            
            # 如果指定了店鋪ID，則只搜尋該店鋪的銷售記錄
            if store_id:
                query += " AND ts.store_id = %s"
                query += (
                    " ORDER BY"
                    " (COALESCE(NULLIF(st.store_name, ''), CAST(ts.store_id AS CHAR)) = ''),"
                    " COALESCE(NULLIF(st.store_name, ''), CAST(ts.store_id AS CHAR)),"
                    " (COALESCE(NULLIF(m.member_code, ''), '') = ''),"
                    " CHAR_LENGTH(COALESCE(NULLIF(m.member_code, ''), '')),"
                    " COALESCE(NULLIF(m.member_code, ''), ''),"
                    " ts.date DESC"
                )
                like = f"%{keyword}%"
                cursor.execute(query, (like, like, like, store_id))
            else:
                query += (
                    " ORDER BY"
                    " (COALESCE(NULLIF(st.store_name, ''), CAST(ts.store_id AS CHAR)) = ''),"
                    " COALESCE(NULLIF(st.store_name, ''), CAST(ts.store_id AS CHAR)),"
                    " (COALESCE(NULLIF(m.member_code, ''), '') = ''),"
                    " CHAR_LENGTH(COALESCE(NULLIF(m.member_code, ''), '')),"
                    " COALESCE(NULLIF(m.member_code, ''), ''),"
                    " ts.date DESC"
                )
                like = f"%{keyword}%"
                cursor.execute(query, (like, like, like))
                
            result = cursor.fetchall()

            # 轉換日期格式為西元年
            for record in result:
                if record['PurchaseDate']:
                    date_obj = record['PurchaseDate']
                    record['PurchaseDate'] = f"{date_obj.year}/{date_obj.month:02d}/{date_obj.day:02d}"
                record['order_group_key'] = _extract_order_group_key(record.get('note') or record.get('Note'))

            return result
    except Exception as e:
        print(f"搜尋療程銷售記錄錯誤: {e}")
        return {"error": str(e)}
    finally:
        conn.close()

def insert_many_therapy_sells(sales_data_list: list[dict]):
    if not sales_data_list:
        logging.warning("--- [MODEL] insert_many_therapy_sells: Received empty sales_data_list.")
        return {"success": False, "error": "沒有提供銷售數據"}

    conn = None
    created_ids = []
    try: 
        if not isinstance(sales_data_list, list):
            return {"success": False, "error": f"內部錯誤：期望列表，但收到 {type(sales_data_list)}"}
        
        conn = connect_to_db()
        conn.begin()

        with conn.cursor() as cursor:
            error_msg = "Each sale item must be a dictionary."
            insert_query = (
                """
                    INSERT INTO therapy_sell (
                        therapy_id, therapy_name, member_id, store_id, staff_id, date,
                        amount, discount, final_price, payment_method, sale_category, note
                    ) VALUES (
                        %(therapy_id)s, %(therapy_name)s, %(member_id)s, %(store_id)s, %(staff_id)s, %(date)s,
                        %(amount)s, %(discount)s, %(final_price)s, %(payment_method)s, %(sale_category)s, %(note)s
                    )
                """
            )
            for index, data_item in enumerate(sales_data_list):

                if not isinstance(data_item, dict):
                    logging.error(f"--- [MODEL] {error_msg} ---")
                    raise TypeError(error_msg)

                if not hasattr(data_item, 'get'):
                    logging.error(f"--- [MODEL] {error_msg} ---")
                    raise AttributeError(error_msg)

                order_group_key = (
                    data_item.get("order_group_key")
                    or data_item.get("orderGroupKey")
                    or data_item.get("order_group_id")
                    or data_item.get("orderGroupId")
                    or data_item.get("order_reference")
                )

                # 若為組合 (bundle)，需拆解為多筆療程紀錄
                bundle_id = data_item.get("bundle_id")
                if bundle_id:
                    bundle_qty = int(data_item.get("amount", 1))
                    cursor.execute(
                        "SELECT name FROM therapy_bundles WHERE bundle_id = %s",
                        (bundle_id,)
                    )
                    bundle_row = cursor.fetchone()
                    bundle_name = bundle_row.get("name") if bundle_row else None
                    cursor.execute(
                        "SELECT item_id, quantity FROM therapy_bundle_items WHERE bundle_id = %s",
                        (bundle_id,)
                    )
                    bundle_items = cursor.fetchall()
                    if not bundle_items:
                        empty_bundle_values = {
                            "therapy_id": None,
                            "therapy_name": bundle_name or data_item.get("therapy_name") or data_item.get("therapyName"),
                            "member_id": data_item.get("memberId"),
                            "store_id": data_item.get("storeId"),
                            "staff_id": data_item.get("staffId"),
                            "date": data_item.get("purchaseDate", datetime.now().strftime("%Y-%m-%d")),
                            "amount": bundle_qty,
                            "discount": float(data_item.get("discount") or 0),
                            "final_price": float(data_item.get("final_price") or data_item.get("finalPrice") or 0),
                            "payment_method": data_item.get("paymentMethod"),
                            "sale_category": data_item.get("saleCategory"),
                            "note": _build_note(data_item.get("note"), order_group_key, bundle_id)
                        }
                        logging.debug(
                            f"--- [MODEL] Values for SQL for empty bundle {index + 1}: {empty_bundle_values}"
                        )
                        cursor.execute(insert_query, empty_bundle_values)
                        created_ids.append(cursor.lastrowid)
                        logging.debug(
                            f"--- [MODEL] Empty bundle inserted. ID: {cursor.lastrowid}"
                        )
                        continue
                    processed_items = []
                    total_amount = 0
                    base_total_sum = 0.0

                    for item in bundle_items:
                        amount = int(item.get("quantity", 0)) * bundle_qty
                        item_values = {
                            "therapy_id": item.get("item_id"),
                            "member_id": data_item.get("memberId"),
                            "store_id": data_item.get("storeId"),
                            "staff_id": data_item.get("staffId"),
                            "date": data_item.get("purchaseDate", datetime.now().strftime("%Y-%m-%d")),
                            "amount": amount,
                            "payment_method": data_item.get("paymentMethod"),
                            "sale_category": data_item.get("saleCategory"),
                            "note": _build_note(data_item.get("note"), order_group_key, bundle_id),
                        }
                        cursor.execute(
                            "SELECT name, price, status FROM therapy WHERE therapy_id = %s",
                            (item_values["therapy_id"],),
                        )
                        price_row = cursor.fetchone()
                        if not price_row:
                            bundle_label = bundle_name or str(bundle_id)
                            item_label = str(item_values.get("therapy_id"))
                            raise ValueError(f"組合{bundle_label}之品項{item_label}不存在")

                        if price_row.get("status") != 'PUBLISHED':
                            logging.warning(
                                "--- [MODEL] Therapy %s in bundle %s is not published but will be processed.",
                                price_row.get("name") or item_values.get("therapy_id"),
                                bundle_name or bundle_id,
                            )

                        unit_price = float(price_row["price"]) if price_row.get("price") is not None else 0.0
                        base_total = unit_price * amount
                        item_values["therapy_name"] = price_row["name"] if price_row.get("name") is not None else None

                        processed_items.append(
                            {
                                "values": item_values,
                                "amount": amount,
                                "unit_price": unit_price,
                                "base_total": base_total,
                            }
                        )
                        total_amount += amount
                        base_total_sum += base_total

                    raw_bundle_discount = _safe_float(data_item.get("discount"))
                    raw_bundle_final_price = _safe_float(data_item.get("finalPrice") or data_item.get("final_price"))

                    bundle_final_total = raw_bundle_final_price
                    if bundle_final_total is None:
                        if raw_bundle_discount is not None and base_total_sum:
                            bundle_final_total = base_total_sum - raw_bundle_discount
                        else:
                            bundle_final_total = base_total_sum
                    bundle_final_total = max(bundle_final_total or 0.0, 0.0)

                    bundle_discount_total = raw_bundle_discount
                    if bundle_discount_total is None:
                        bundle_discount_total = max(base_total_sum - bundle_final_total, 0.0)
                    else:
                        bundle_discount_total = max(bundle_discount_total, 0.0)

                    allocated_final = 0.0
                    allocated_discount = 0.0
                    item_count = len(processed_items)

                    for idx, processed in enumerate(processed_items):
                        values_dict = processed["values"]
                        base_total = processed["base_total"]
                        amount = processed["amount"]

                        if base_total_sum > 0:
                            ratio = base_total / base_total_sum
                        elif total_amount > 0:
                            ratio = amount / total_amount
                        else:
                            ratio = 1.0 / item_count if item_count else 0.0

                        if idx == item_count - 1:
                            item_final_price = bundle_final_total - allocated_final
                            item_discount = bundle_discount_total - allocated_discount
                        else:
                            item_final_price = round(bundle_final_total * ratio, 2)
                            item_discount = round(bundle_discount_total * ratio, 2)
                            allocated_final += item_final_price
                            allocated_discount += item_discount

                        item_final_price = max(round(item_final_price, 2), 0.0)
                        item_discount = max(round(item_discount, 2), 0.0)

                        values_dict["discount"] = item_discount
                        values_dict["final_price"] = item_final_price

                        logging.debug(
                            f"--- [MODEL] Values for SQL for bundle item {index + 1}-{idx + 1}: {values_dict}"
                        )
                        cursor.execute(insert_query, values_dict)
                        created_ids.append(cursor.lastrowid)
                        logging.debug(
                            f"--- [MODEL] Bundle item inserted. ID: {cursor.lastrowid}"
                        )
                    continue

                # 一般單一療程資料
                values_dict = {
                    "therapy_id": data_item.get("therapy_id"),
                    "member_id": data_item.get("memberId"),
                    "store_id": data_item.get("storeId"),
                    "staff_id": data_item.get("staffId"),
                    "date": data_item.get("purchaseDate", datetime.now().strftime("%Y-%m-%d")),
                    "amount": data_item.get("amount"),
                    "discount": float(data_item.get("discount") or 0),
                    "final_price": float(data_item.get("final_price") or data_item.get("finalPrice") or 0),
                    "payment_method": data_item.get("paymentMethod"),
                    "sale_category": data_item.get("saleCategory"),
                    "note": _build_note(data_item.get("note"), order_group_key)
                }
                cursor.execute("SELECT name, price, status FROM therapy WHERE therapy_id = %s", (values_dict["therapy_id"],))
                price_row = cursor.fetchone()
                if not price_row or price_row.get("status") != 'PUBLISHED':
                    item_label = price_row.get("name") if price_row else None
                    if not item_label:
                        item_label = str(values_dict.get("therapy_id"))
                    raise ValueError(f"品項{item_label}已下架")
                unit_price = float(price_row["price"]) if price_row.get("price") is not None else 0.0
                values_dict["therapy_name"] = price_row["name"] if price_row.get("name") is not None else None
                explicit_discount = _safe_float(data_item.get("discount"))
                explicit_final = _safe_float(data_item.get("finalPrice") or data_item.get("final_price"))
                if explicit_discount is not None:
                    values_dict["discount"] = round(max(explicit_discount, 0.0), 2)
                else:
                    values_dict["discount"] = round(float(values_dict.get("discount") or 0), 2)

                if explicit_final is not None:
                    values_dict["final_price"] = round(max(explicit_final, 0.0), 2)
                else:
                    values_dict["final_price"] = round(unit_price * values_dict["amount"] - values_dict["discount"], 2)
                logging.debug(f"--- [MODEL] Values for SQL for item {index + 1}: {values_dict}")
                cursor.execute(insert_query, values_dict)
                created_ids.append(cursor.lastrowid)
                logging.debug(f"--- [MODEL] Item {index + 1} inserted. ID: {cursor.lastrowid}")
                
                # 庫存/療程次數更新邏輯 (如果啟用)
                # therapy_id_val = values_dict.get("therapy_id")
                # member_id_val = values_dict.get("member_id")
                # store_id_val = values_dict.get("store_id")
                # amount_val = values_dict.get("amount")
                # if all(v is not None for v in [therapy_id_val, member_id_val, store_id_val, amount_val]):
                #     update_therapy_usage_or_stock(
                #         int(therapy_id_val), int(member_id_val), int(store_id_val), 
                #         -abs(int(amount_val)), cursor
                #     )
            
        conn.commit()
        logging.info(f"--- [MODEL] Transaction committed successfully for IDs: {created_ids} ---")
        return {"success": True, "message": f"共 {len(created_ids)} 筆療程銷售紀錄新增成功", "ids": created_ids}

        # ----- 修改您的異常捕獲塊 -----
    except AttributeError as ae: # 捕獲 'list' object has no attribute 'get'
        if conn: conn.rollback()
        tb_str = traceback.format_exc()
        logging.error(f"--- [MODEL] ATTRIBUTE ERROR in insert_many_therapy_sells ---\n{tb_str}")
        return {"success": False, "error": f"內部屬性錯誤: {str(ae)}", "traceback": tb_str}
    except TypeError as te:
        if conn: conn.rollback()
        tb_str = traceback.format_exc()
        logging.error(f"--- [MODEL] TYPE ERROR in insert_many_therapy_sells ---\n{tb_str}")
        return {"success": False, "error": f"內部資料型別錯誤: {str(te)}", "traceback": tb_str}
    except KeyError as ke:
        if conn: conn.rollback()
        tb_str = traceback.format_exc()
        logging.error(f"--- [MODEL] KEY ERROR in insert_many_therapy_sells (missing key: {ke}) ---\n{tb_str}")
        return {"success": False, "error": f"提交資料缺少鍵: {str(ke)}", "traceback": tb_str}
    except pymysql.err.Error as db_err: # 捕獲所有 pymysql 相關的錯誤
        if conn: conn.rollback()
        tb_str = traceback.format_exc()
        logging.error(f"--- [MODEL] DATABASE ERROR in insert_many_therapy_sells ---\n{tb_str}")
        return {"success": False, "error": f"資料庫錯誤: {db_err.args[0] if len(db_err.args) > 0 else str(db_err)}", "traceback": tb_str}
    except ValueError as ve:
        if conn: conn.rollback()
        tb_str = traceback.format_exc()
        logging.error(f"--- [MODEL] VALUE ERROR in insert_many_therapy_sells ---\n{tb_str}")
        error_message = str(ve) or "數值錯誤"
        return {"success": False, "error": error_message, "traceback": tb_str}
    except Exception as e: # 捕獲所有其他未預期錯誤
        if conn: conn.rollback()
        tb_str = traceback.format_exc()
        logging.error(f"--- [MODEL] UNEXPECTED ERROR in insert_many_therapy_sells ---\n{tb_str}")
        return {"success": False, "error": f"伺服器未知錯誤: {type(e).__name__} - {str(e)}", "traceback": tb_str}
    finally:
        if conn:
            conn.close()
        logging.debug(f"--- [MODEL] Exiting insert_many_therapy_sells ---")

def update_therapy_sell(sale_id, data):
    """更新單筆療程銷售紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM therapy_sell WHERE therapy_sell_id = %s", (sale_id,))
            existing_record = cursor.fetchone()
            if not existing_record:
                return {"error": "找不到要更新的銷售記錄"}

            existing_order_group_key = _extract_order_group_key(existing_record.get("note"))
            incoming_order_group_key = (
                data.get("order_group_key")
                or data.get("orderGroupKey")
                or data.get("order_group_id")
                or data.get("orderGroupId")
                or data.get("order_reference")
                or existing_order_group_key
            )
            order_group_key = incoming_order_group_key or existing_order_group_key
            bundle_tag_id = _extract_bundle_id_from_note(existing_record.get("note"))

            therapy_id = data.get("therapy_id") or existing_record.get("therapy_id")
            cursor.execute("SELECT status FROM therapy WHERE therapy_id = %s", (therapy_id,))
            status_row = cursor.fetchone()
            if not status_row or status_row.get('status') != 'PUBLISHED':
                return {"error": "品項已下架"}

            member_id = data.get("memberId", existing_record.get("member_id"))
            store_id = data.get("storeId", existing_record.get("store_id"))
            staff_id = data.get("staffId", existing_record.get("staff_id"))
            purchase_date = data.get("purchaseDate", existing_record.get("date"))
            amount = data.get("amount", existing_record.get("amount"))
            discount = data.get("discount", existing_record.get("discount") or 0)
            final_price = data.get("finalPrice")

            if final_price is None:
                cursor.execute("SELECT price FROM therapy WHERE therapy_id = %s", (therapy_id,))
                price_row = cursor.fetchone()
                unit_price = price_row["price"] if price_row and price_row.get("price") is not None else 0
                final_price = unit_price * amount - discount

            payment_method = data.get("paymentMethod", existing_record.get("payment_method"))
            sale_category = data.get("saleCategory", existing_record.get("sale_category"))
            raw_note = data.get("note")
            if raw_note is None:
                raw_note = existing_record.get("note")
            note = _build_note(raw_note, order_group_key, bundle_tag_id)

            query = (
                "UPDATE therapy_sell SET therapy_id=%s, member_id=%s, store_id=%s, staff_id=%s, "
                "date=%s, amount=%s, discount=%s, final_price=%s, payment_method=%s, sale_category=%s, note=%s "
                "WHERE therapy_sell_id=%s"
            )
            cursor.execute(query, (
                therapy_id,
                member_id,
                store_id,
                staff_id,
                purchase_date,
                amount,
                discount,
                final_price,
                payment_method,
                sale_category,
                note,
                sale_id,
            ))

        conn.commit()
        return {"success": True, "message": "療程銷售紀錄更新成功"}
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"更新療程銷售錯誤: {e}")
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()

def delete_therapy_sell(sale_id):
    """刪除療程銷售紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = "DELETE FROM therapy_sell WHERE therapy_sell_id = %s"
            cursor.execute(query, (sale_id,))
            
        conn.commit()
        return {"success": True, "message": "療程銷售紀錄刪除成功"}
    except Exception as e:
        conn.rollback()
        print(f"刪除療程銷售錯誤: {e}")
        return {"error": str(e)}
    finally:
        conn.close()

def get_member_by_id(member_id):
    """根據ID獲取會員資訊"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = "SELECT member_id, name FROM member WHERE member_id = %s"
            cursor.execute(query, (member_id,))
            result = cursor.fetchone()
            return result
    except Exception as e:
        print(f"獲取會員資訊錯誤: {e}")
        return None
    finally:
        conn.close()

def get_all_members():
    """獲取所有會員"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = "SELECT member_id, name FROM member ORDER BY name"
            cursor.execute(query)
            result = cursor.fetchall()
            return result
    except Exception as e:
        print(f"獲取會員列表錯誤: {e}")
        return {"error": str(e)}
    finally:
        conn.close()

def get_all_staff(store_id=None):
    """獲取所有員工，若提供分店則僅回傳該店員工"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            if store_id:
                query = "SELECT staff_id, name FROM staff WHERE store_id = %s ORDER BY name"
                cursor.execute(query, (store_id,))
            else:
                query = "SELECT staff_id, name FROM staff ORDER BY name"
                cursor.execute(query)
            result = cursor.fetchall()
            return result
    except Exception as e:
        print(f"獲取員工列表錯誤: {e}")
        return {"error": str(e)}
    finally:
        conn.close()

def get_all_stores():
    """獲取所有店鋪"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = "SELECT store_id, store_name as name FROM store ORDER BY store_name"
            cursor.execute(query)
            result = cursor.fetchall()
            return result
    except Exception as e:
        print(f"獲取店鋪列表錯誤: {e}")
        return {"error": str(e)}
    finally:
        conn.close() 

# vvvvvvvvvv 我們要新增的核心函式 vvvvvvvvvv
def get_remaining_sessions(member_id, therapy_id):
    """計算並【直接回傳】剩餘次數這個數字"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 計算購買總量
            cursor.execute(
                "SELECT COALESCE(SUM(amount), 0) as total_purchased FROM therapy_sell WHERE member_id = %s AND therapy_id = %s",
                (member_id, therapy_id)
            )
            purchased_result = cursor.fetchone()
            total_purchased = int(float(purchased_result['total_purchased'])) if purchased_result and purchased_result.get('total_purchased') is not None else 0
            
            # 計算已使用量
            cursor.execute(
                "SELECT COALESCE(SUM(deduct_sessions), 0) as total_used FROM therapy_record WHERE member_id = %s AND therapy_id = %s",
                (member_id, therapy_id)
            )
            used_result = cursor.fetchone()
            total_used = int(float(used_result['total_used'])) if used_result and used_result.get('total_used') is not None else 0
            
            # 直接回傳計算結果的數字
            return total_purchased - total_used
    except Exception as e:
        raise e
    finally:
        if conn:
            conn.close()

# ---- Helper to fetch remaining sessions for a member across all therapies ----
def get_remaining_sessions_bulk(member_id):
    """Return a mapping of therapy_id -> remaining sessions for the given member."""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # Total purchased per therapy for this member
            cursor.execute(
                """
                SELECT therapy_id, COALESCE(SUM(amount),0) AS total_purchased
                FROM therapy_sell
                WHERE member_id = %s
                GROUP BY therapy_id
                """,
                (member_id,)
            )
            purchased_rows = cursor.fetchall()
            purchased = {
                int(row["therapy_id"]): int(float(row["total_purchased"]))
                for row in purchased_rows if row.get("therapy_id") is not None
            }

            # Total used sessions per therapy for this member
            cursor.execute(
                """
                SELECT therapy_id, COALESCE(SUM(deduct_sessions),0) AS total_used
                FROM therapy_record
                WHERE member_id = %s
                GROUP BY therapy_id
                """,
                (member_id,)
            )
            used_rows = cursor.fetchall()
            used = {
                int(row["therapy_id"]): int(float(row["total_used"]))
                for row in used_rows if row.get("therapy_id") is not None
            }

            all_ids = set(purchased.keys()) | set(used.keys())
            result = {
                tid: purchased.get(tid, 0) - used.get(tid, 0)
                for tid in all_ids
            }
            return result
    finally:
        if conn:
            conn.close()
