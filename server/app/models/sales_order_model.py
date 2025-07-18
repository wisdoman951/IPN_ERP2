# app/models/sales_order_model.py
import pymysql
from app.config import DB_CONFIG
from datetime import datetime
import traceback

def connect_to_db():
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

def create_sales_order(order_data: dict):
    conn = None
    try:
        conn = connect_to_db()
        conn.begin()
        with conn.cursor() as cursor:
            # 1. 插入主訂單 (sales_orders)
            order_query = """
                INSERT INTO sales_orders (
                    order_number, order_date, member_id, staff_id, store_id, 
                    subtotal, total_discount, grand_total, sale_category, note
                ) VALUES (
                    %(order_number)s, %(order_date)s, %(member_id)s, %(staff_id)s, %(store_id)s,
                    %(subtotal)s, %(total_discount)s, %(grand_total)s, %(sale_category)s, %(note)s
                )
            """
            
            # ***** 關鍵修改：構建一個鍵名與 SQL 佔位符匹配的新字典 *****
            order_main_data_for_sql = {
                "order_number": order_data.get("order_number"), # 這個是在路由層生成的
                "order_date": order_data.get("order_date"),
                "member_id": order_data.get("member_id"),   # 從前端獲取 member_id
                "staff_id": order_data.get("staff_id"),     # 從前端獲取 staff_id
                "store_id": order_data.get("store_id"),
                "subtotal": order_data.get("subtotal"),
                "total_discount": order_data.get("total_discount"),
                "grand_total": order_data.get("grand_total"),
                "sale_category": order_data.get("sale_category"),
                "note": order_data.get("note")
            }
            items_data = order_data.get("items", [])
            
            print(f"--- [MODEL] Inserting into sales_orders with SQL-ready data: {order_main_data_for_sql}")
            cursor.execute(order_query, order_main_data_for_sql) # <-- 使用轉換後的新字典
            order_id = cursor.lastrowid
            print(f"--- [MODEL] sales_orders inserted. New order_id: {order_id}")


            # 2. 遍歷並插入訂單項目 (sales_order_items)
            if not items_data:
                raise ValueError("銷售單必須至少包含一個品項。")

            item_query = """
                INSERT INTO sales_order_items (
                    order_id, product_id, therapy_id, item_description, item_type,
                    unit, unit_price, quantity, subtotal, category, note
                ) VALUES (
                    %(order_id)s, %(product_id)s, %(therapy_id)s, %(item_description)s, %(item_type)s,
                    %(unit)s, %(unit_price)s, %(quantity)s, %(subtotal)s, %(category)s, %(note)s
                )
            """
            for item in items_data:
                item['order_id'] = order_id
                # item_values_dict 的鍵名與 item_query 的佔位符匹配，這部分邏輯是正確的
                cursor.execute(item_query, item)
        
        conn.commit()
        return {"success": True, "order_id": order_id, "message": "銷售單新增成功"}
    except KeyError as ke: # 捕獲因為鍵名不匹配導致的錯誤
        if conn: conn.rollback()
        error_msg = f"後端處理錯誤：提交的數據中缺少必要的鍵 '{ke.args[0]}'"
        print(f"--- [MODEL] {error_msg} ---")
        traceback.print_exc()
        return {"success": False, "error": error_msg}
    except Exception as e:
        if conn: conn.rollback()
        print(f"--- [MODEL] Error creating sales order ---")
        traceback.print_exc()
        # 直接拋出異常，讓路由層統一處理成 JSON 回應
        raise e
    finally:
        if conn:
            conn.close()

def get_all_sales_orders(keyword: str = None):
    """
    獲取所有銷售單列表，可選關鍵字搜尋。
    搜尋範圍: 銷售單號, 會員姓名, 銷售人員姓名
    """
    conn = None
    try:
        conn = connect_to_db()
        with conn.cursor() as cursor:
            # 透過 JOIN 獲取關聯的名稱
            query = """
                SELECT 
                    so.order_id,
                    so.order_number,
                    so.order_date,
                    so.grand_total,
                    so.sale_category,
                    so.note,
                    m.name AS member_name,
                    s.name AS staff_name
                FROM sales_orders so
                LEFT JOIN member m ON so.member_id = m.member_id
                LEFT JOIN staff s ON so.staff_id = s.staff_id
            """
            
            params = []
            if keyword:
                like_keyword = f"%{keyword}%"
                query += " WHERE so.order_number LIKE %s OR m.name LIKE %s OR s.name LIKE %s"
                params.extend([like_keyword, like_keyword, like_keyword])

            query += " ORDER BY so.order_date DESC, so.order_id DESC"
            
            cursor.execute(query, tuple(params))
            result = cursor.fetchall()
            return {"success": True, "data": result}
    except Exception as e:
        print(f"Error getting sales orders: {e}")
        return {"success": False, "error": str(e)}
    finally:
        if conn:
            conn.close()

def delete_sales_orders_by_ids(order_ids: list[int]):
    """根據 order_id 列表刪除銷售單"""
    if not order_ids:
        return {"success": False, "error": "未提供要刪除的銷售單ID"}
    
    conn = None
    try:
        conn = connect_to_db()
        conn.begin()
        with conn.cursor() as cursor:
            placeholders = ', '.join(['%s'] * len(order_ids))
            # 由於 sales_order_items 表設定了 ON DELETE CASCADE，相關的項目會被自動刪除
            query = f"DELETE FROM sales_orders WHERE order_id IN ({placeholders})"
            deleted_count = cursor.execute(query, tuple(order_ids))
        conn.commit()
        return {"success": True, "message": f"成功刪除 {deleted_count} 筆銷售單。"}
    except Exception as e:
        if conn: conn.rollback()
        print(f"Error deleting sales orders: {e}")
        return {"success": False, "error": str(e)}
    finally:
        if conn: conn.close()