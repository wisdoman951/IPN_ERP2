# server\app\models\therapy_sell_model.py
import pymysql
from app.config import DB_CONFIG
from datetime import datetime
import traceback
import logging
import json
from decimal import Decimal
from app.utils.pricing import resolve_member_prices
def connect_to_db():
    """連接到數據庫"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

def get_all_therapy_packages(
    status: str | None = 'PUBLISHED',
    store_id: int | None = None,
    member_identity_type: str | None = None,
    price_store_id: int | None = None,
):
    """獲取所有療程套餐"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT t.therapy_id, t.code AS TherapyCode, t.price AS TherapyPrice,
                       t.name AS TherapyName, t.content AS TherapyContent,
                       t.visible_store_ids, GROUP_CONCAT(c.name) AS categories
                FROM therapy t
                LEFT JOIN therapy_category tc ON t.therapy_id = tc.therapy_id
                LEFT JOIN category c ON tc.category_id = c.category_id
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
                    filtered.append(row)
            therapy_ids = [row['therapy_id'] for row in filtered]
            pricing_store = price_store_id if price_store_id is not None else store_id
            price_map = resolve_member_prices('THERAPY', therapy_ids, member_identity_type, pricing_store)

            for row in filtered:
                price_info = price_map.get(row['therapy_id']) if price_map else None
                if price_info:
                    member_price = price_info.get('price')
                    if isinstance(member_price, Decimal):
                        member_price = float(member_price)
                    elif member_price is not None:
                        member_price = float(member_price)
                    row['member_price'] = member_price
                    row['member_custom_code'] = price_info.get('custom_code')
                    custom_name = price_info.get('custom_name')
                    if custom_name:
                        row['member_custom_name'] = custom_name
                    row['member_price_book_id'] = price_info.get('price_book_id')
                    row['member_price_book_name'] = price_info.get('price_book_name')
                    metadata = price_info.get('metadata')
                    if metadata:
                        row['member_price_metadata'] = metadata
                else:
                    row['member_price'] = None
                    row['member_custom_code'] = None
                    row['member_price_book_id'] = None
                    row['member_price_book_name'] = None

                base_price = row.get('TherapyPrice')
                if isinstance(base_price, Decimal):
                    base_price = float(base_price)
                    row['TherapyPrice'] = base_price
                row['effective_price'] = row['member_price'] if row['member_price'] is not None else base_price
                if 'member_custom_name' not in row or not row.get('member_custom_name'):
                    row['member_custom_name'] = row.get('TherapyName')

            return filtered
    except Exception as e:
        print(f"獲取療程套餐錯誤: {e}")
        return {"error": str(e)}
    finally:
        conn.close()

def search_therapy_packages(
    keyword,
    status: str | None = 'PUBLISHED',
    store_id: int | None = None,
    member_identity_type: str | None = None,
    price_store_id: int | None = None,
):
    """搜尋療程套餐"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT t.therapy_id, t.code AS TherapyCode, t.price AS TherapyPrice,
                       t.name AS TherapyName, t.content AS TherapyContent,
                       t.visible_store_ids, GROUP_CONCAT(c.name) AS categories
                FROM therapy t
                LEFT JOIN therapy_category tc ON t.therapy_id = tc.therapy_id
                LEFT JOIN category c ON tc.category_id = c.category_id
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
                    filtered.append(row)
            therapy_ids = [row['therapy_id'] for row in filtered]
            pricing_store = price_store_id if price_store_id is not None else store_id
            price_map = resolve_member_prices('THERAPY', therapy_ids, member_identity_type, pricing_store)

            for row in filtered:
                price_info = price_map.get(row['therapy_id']) if price_map else None
                if price_info:
                    member_price = price_info.get('price')
                    if isinstance(member_price, Decimal):
                        member_price = float(member_price)
                    elif member_price is not None:
                        member_price = float(member_price)
                    row['member_price'] = member_price
                    row['member_custom_code'] = price_info.get('custom_code')
                    custom_name = price_info.get('custom_name')
                    if custom_name:
                        row['member_custom_name'] = custom_name
                    row['member_price_book_id'] = price_info.get('price_book_id')
                    row['member_price_book_name'] = price_info.get('price_book_name')
                    metadata = price_info.get('metadata')
                    if metadata:
                        row['member_price_metadata'] = metadata
                else:
                    row['member_price'] = None
                    row['member_custom_code'] = None
                    row['member_price_book_id'] = None
                    row['member_price_book_name'] = None

                base_price = row.get('TherapyPrice')
                if isinstance(base_price, Decimal):
                    base_price = float(base_price)
                    row['TherapyPrice'] = base_price
                row['effective_price'] = row['member_price'] if row['member_price'] is not None else base_price
                if 'member_custom_name' not in row or not row.get('member_custom_name'):
                    row['member_custom_name'] = row.get('TherapyName')

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

                # 若為組合 (bundle)，需拆解為多筆療程紀錄
                bundle_id = data_item.get("bundle_id")
                if bundle_id:
                    bundle_qty = int(data_item.get("amount", 1))
                    cursor.execute(
                        "SELECT item_id, quantity FROM therapy_bundle_items WHERE bundle_id = %s",
                        (bundle_id,)
                    )
                    bundle_items = cursor.fetchall()
                    if not bundle_items:
                        cursor.execute(
                            "SELECT name FROM therapy_bundles WHERE bundle_id = %s",
                            (bundle_id,),
                        )
                        bundle_row = cursor.fetchone()
                        bundle_name = bundle_row.get("name") if bundle_row else None
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
                            "note": f"{data_item.get('note', '')} [bundle:{bundle_id}]"
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
                    total_qty = sum(item.get('quantity', 0) for item in bundle_items) or 1
                    for item in bundle_items:
                        item_values = {
                            "therapy_id": item.get("item_id"),
                            "member_id": data_item.get("memberId"),
                            "store_id": data_item.get("storeId"),
                            "staff_id": data_item.get("staffId"),
                            "date": data_item.get("purchaseDate", datetime.now().strftime("%Y-%m-%d")),
                            "amount": int(item.get("quantity", 0)) * bundle_qty,
                            "discount": float(data_item.get("discount") or 0) * (item.get("quantity", 0) / total_qty),
                            "payment_method": data_item.get("paymentMethod"),
                            "sale_category": data_item.get("saleCategory"),
                            "note": f"{data_item.get('note', '')} [bundle:{bundle_id}]",
                        }
                        cursor.execute("SELECT name, price, status FROM therapy WHERE therapy_id = %s", (item_values["therapy_id"],))
                        price_row = cursor.fetchone()
                        if not price_row or price_row.get("status") != 'PUBLISHED':
                            raise ValueError("品項已下架")
                        unit_price = float(price_row["price"]) if price_row.get("price") is not None else 0.0
                        item_values["therapy_name"] = price_row["name"] if price_row.get("name") is not None else None
                        item_values["discount"] = float(item_values.get("discount") or 0)
                        item_values["final_price"] = unit_price * item_values["amount"] - item_values["discount"]
                        logging.debug(
                            f"--- [MODEL] Values for SQL for bundle item {index + 1}: {item_values}"
                        )
                        cursor.execute(insert_query, item_values)
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
                    "payment_method": data_item.get("paymentMethod"),
                    "sale_category": data_item.get("saleCategory"),
                    "note": data_item.get("note", "")
                }
                cursor.execute("SELECT name, price, status FROM therapy WHERE therapy_id = %s", (values_dict["therapy_id"],))
                price_row = cursor.fetchone()
                if not price_row or price_row.get("status") != 'PUBLISHED':
                    raise ValueError("品項已下架")
                unit_price = float(price_row["price"]) if price_row.get("price") is not None else 0.0
                values_dict["therapy_name"] = price_row["name"] if price_row.get("name") is not None else None
                values_dict["discount"] = float(values_dict.get("discount") or 0)
                values_dict["final_price"] = unit_price * values_dict["amount"] - values_dict["discount"]
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
        return {"success": False, "error": f"數值錯誤: {str(ve)}", "traceback": tb_str}
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
            note = data.get("note", existing_record.get("note"))

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
