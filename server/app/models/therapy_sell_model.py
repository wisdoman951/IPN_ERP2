# server\app\models\therapy_sell_model.py
import pymysql
from app.config import DB_CONFIG
from datetime import datetime
import traceback
import logging
def connect_to_db():
    """連接到數據庫"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

def get_all_therapy_packages():
    """獲取所有療程套餐"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT therapy_id, code as TherapyCode, price as TherapyPrice, name as TherapyName, content as TherapyContent
                FROM therapy
                ORDER BY code
            """
            cursor.execute(query)
            result = cursor.fetchall()
            return result
    except Exception as e:
        print(f"獲取療程套餐錯誤: {e}")
        return {"error": str(e)}
    finally:
        conn.close()

def search_therapy_packages(keyword):
    """搜尋療程套餐"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT therapy_id, code as TherapyCode, price as TherapyPrice, name as TherapyName, content as TherapyContent
                FROM therapy
                WHERE code LIKE %s OR name LIKE %s OR content LIKE %s
                ORDER BY code
            """
            like = f"%{keyword}%"
            cursor.execute(query, (like, like, like))
            result = cursor.fetchall()
            return result
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
                       m.name as MemberName, 
                       ts.date as PurchaseDate,
                       t.name as PackageName, 
                       t.code as TherapyCode, 
                       ts.amount as Sessions,
                       ts.payment_method as PaymentMethod,
                       s.name as StaffName,
                       ts.sale_category as SaleCategory,
                       t.price as Price,
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
                query += " ORDER BY ts.date DESC"
                cursor.execute(query, (store_id,))
            else:
                query += " ORDER BY ts.date DESC"
                cursor.execute(query)
                
            result = cursor.fetchall()
            
            for record in result:
                if record.get('PurchaseDate'):
                    date_obj = record['PurchaseDate']
                    if isinstance(date_obj, datetime):
                         record['PurchaseDate'] = f"{date_obj.year - 1911}/{date_obj.month:02d}/{date_obj.day:02d}"
            
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
                       m.name as MemberName,
                       ts.date as PurchaseDate,
                       t.name as PackageName,
                       t.code as TherapyCode,
                       ts.amount as Sessions,
                       ts.payment_method as PaymentMethod,
                       s.name as StaffName,
                       ts.sale_category as SaleCategory,
                       t.price as Price,
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
                WHERE (m.name LIKE %s OR m.member_id LIKE %s OR s.name LIKE %s)
            """
            
            # 如果指定了店鋪ID，則只搜尋該店鋪的銷售記錄
            if store_id:
                query += " AND ts.store_id = %s"
                query += " ORDER BY ts.date DESC"
                like = f"%{keyword}%"
                cursor.execute(query, (like, like, like, store_id))
            else:
                query += " ORDER BY ts.date DESC"
                like = f"%{keyword}%"
                cursor.execute(query, (like, like, like))
                
            result = cursor.fetchall()
            
            # 轉換日期格式為民國年
            for record in result:
                if record['PurchaseDate']:
                    date_obj = record['PurchaseDate']
                    record['PurchaseDate'] = f"{date_obj.year - 1911}/{date_obj.month:02d}/{date_obj.day:02d}"
            
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
            for index, data_item in enumerate(sales_data_list):

                if not isinstance(data_item, dict):
                    logging.error(f"--- [MODEL] {error_msg} ---")
                    raise TypeError(error_msg)

                # 檢查 data_item 是否真的有 .get 方法
                if not hasattr(data_item, 'get'):
                    logging.error(f"--- [MODEL] {error_msg} ---")
                    raise AttributeError(error_msg)

                # 從 data_item (字典) 中安全地獲取值
                # 確保前端傳來的 key (例如 'memberId') 與這裡 get 的 key 一致
                values_dict = {
                    "therapy_id": data_item.get("therapy_id"),
                    "member_id": data_item.get("memberId"), 
                    "store_id": data_item.get("storeId"),
                    "staff_id": data_item.get("staffId"),
                    "date": data_item.get("purchaseDate", datetime.now().strftime("%Y-%m-%d")),
                    "amount": data_item.get("amount"), 
                    "discount": data_item.get("discount", 0), 
                    "payment_method": data_item.get("paymentMethod"), 
                    "sale_category": data_item.get("saleCategory"),   
                    "note": data_item.get("note", "")
                }
                logging.debug(f"--- [MODEL] Values for SQL for item {index + 1}: {values_dict}")

                # 您的 INSERT 語句，確保欄位列表與 therapy_sell 表定義匹配
                query = """
                    INSERT INTO therapy_sell (
                        therapy_id, member_id, store_id, staff_id, date, 
                        amount, discount, payment_method, sale_category, note
                    ) VALUES (
                        %(therapy_id)s, %(member_id)s, %(store_id)s, %(staff_id)s, %(date)s, 
                        %(amount)s, %(discount)s, %(payment_method)s, %(sale_category)s, %(note)s
                    )
                """
                cursor.execute(query, values_dict)
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
    """更新療程銷售紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 取得現有的記錄
            cursor.execute("SELECT * FROM therapy_sell WHERE therapy_sell_id = %s", (sale_id,))
            existing_record = cursor.fetchone()
            
            if not existing_record:
                return {"error": "找不到要更新的銷售記錄"}
                
            # 根據療程代碼查詢療程ID
            therapy_id = existing_record.get("therapy_id")
            if data.get("therapyPackageId"):
                therapy_code = data.get("therapyPackageId")
                cursor.execute("SELECT therapy_id FROM therapy WHERE code = %s", (therapy_code,))
                therapy_result = cursor.fetchone()
                if therapy_result:
                    therapy_id = therapy_result["therapy_id"]
                    
            # 提取數據並使用現有值作為默認值
            member_id = data.get("memberId", existing_record["member_id"])
            store_id = data.get("storeId", existing_record["store_id"])
            staff_id = data.get("staffId", existing_record["staff_id"])
            purchase_date = data.get("purchaseDate", existing_record["date"])
            sessions = data.get("sessions", existing_record["amount"])
            discount = data.get("discount", existing_record["discount"])
            payment_method = data.get("paymentMethod", existing_record.get("payment_method", "Cash"))
            sale_category = data.get("salesCategory", existing_record.get("sale_category", ""))
            note = data.get("note", existing_record["note"])
            
            # 處理付款相關附加資訊
            if data.get("transferCode"):
                if "轉帳碼:" in note:
                    note = note.replace(note.split("轉帳碼:")[1].split(",")[0], data.get("transferCode"))
                else:
                    note = f"轉帳碼: {data.get('transferCode')}, " + note
                    
            if data.get("cardNumber"):
                if "卡號:" in note:
                    note = note.replace(note.split("卡號:")[1].split(",")[0], data.get("cardNumber"))
                else:
                    note = f"卡號: {data.get('cardNumber')}, " + note
            
            # 如果沒有找到對應的療程ID，將療程代碼添加到備註中
            if data.get("therapyPackageId") and not therapy_id:
                if "療程代碼:" in note:
                    note = note.replace(note.split("療程代碼:")[1].split(",")[0], 
                                       f"{data.get('therapyPackageId')} (未找到對應療程)")
                else:
                    note = f"療程代碼: {data.get('therapyPackageId')} (未找到對應療程), " + note
                    
            query = """
                UPDATE therapy_sell
                SET member_id = %s, store_id = %s, staff_id = %s,
                    date = %s, amount = %s, discount = %s, 
                    payment_method = %s, sale_category = %s, therapy_id = %s, note = %s
                WHERE therapy_sell_id = %s
            """
            values = (
                member_id,
                store_id,
                staff_id,
                purchase_date,
                sessions,
                discount,
                payment_method,
                sale_category,
                therapy_id,
                note,
                sale_id
            )
            cursor.execute(query, values)
            
        conn.commit()
        return {"success": True, "message": "療程銷售紀錄更新成功"}
    except Exception as e:
        conn.rollback()
        print(f"更新療程銷售錯誤: {e}")
        return {"error": str(e)}
    finally:
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

def get_all_staff():
    """獲取所有員工"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
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
                "SELECT COUNT(*) as total_used FROM therapy_record WHERE member_id = %s AND therapy_id = %s",
                (member_id, therapy_id)
            )
            used_result = cursor.fetchone()
            total_used = int(used_result['total_used']) if used_result and used_result.get('total_used') is not None else 0
            
            # 直接回傳計算結果的數字
            return total_purchased - total_used
    except Exception as e:
        raise e
    finally:
        if conn:
            conn.close()

# ---- New helper to fetch remaining sessions for multiple therapy packages ----
def get_remaining_sessions_bulk(member_id, therapy_ids):
    """Return a mapping of therapy_id -> remaining sessions for the given member."""
    if not therapy_ids:
        return {}

    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            placeholders = ','.join(['%s'] * len(therapy_ids))
            # Total purchased per therapy
            cursor.execute(
                f"""
                SELECT therapy_id, COALESCE(SUM(amount),0) AS total_purchased
                FROM therapy_sell
                WHERE member_id = %s AND therapy_id IN ({placeholders})
                GROUP BY therapy_id
                """,
                [member_id, *therapy_ids]
            )
            purchased_rows = cursor.fetchall()
            purchased = {row['therapy_id']: int(float(row['total_purchased'])) for row in purchased_rows}

            # Total used per therapy
            cursor.execute(
                f"""
                SELECT therapy_id, COUNT(*) AS total_used
                FROM therapy_record
                WHERE member_id = %s AND therapy_id IN ({placeholders})
                GROUP BY therapy_id
                """,
                [member_id, *therapy_ids]
            )
            used_rows = cursor.fetchall()
            used = {row['therapy_id']: int(row['total_used']) for row in used_rows}

            result = {}
            for tid in therapy_ids:
                result[tid] = purchased.get(tid, 0) - used.get(tid, 0)
            return result
    finally:
        if conn:
            conn.close()