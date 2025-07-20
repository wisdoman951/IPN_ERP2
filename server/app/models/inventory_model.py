import pymysql
from app.config import DB_CONFIG
from datetime import datetime

def connect_to_db():
    """連接到數據庫"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

def get_all_inventory(store_id=None):
    """獲取所有庫存記錄，可依店鋪篩選"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT
                    MAX(i.inventory_id) AS Inventory_ID,
                    p.product_id AS Product_ID,
                    p.name AS ProductName,
                    p.code AS ProductCode, 
                    SUM(i.quantity) AS StockQuantity,
                    SUM(IFNULL(i.stock_in, 0)) AS StockIn,
                    SUM(IFNULL(i.stock_out, 0)) AS StockOut,
                    SUM(IFNULL(i.stock_loan, 0)) AS StockLoan,
                    MAX(i.store_id) AS Store_ID,
                    st.store_name AS StoreName,
                    MAX(IFNULL(i.stock_threshold, 5)) AS StockThreshold,
                    MAX(i.date) AS StockInTime
                FROM inventory i
                LEFT JOIN product p ON i.product_id = p.product_id
                LEFT JOIN store st ON i.store_id = st.store_id
            """
            params = []
            if store_id:
                query += " WHERE i.store_id = %s"
                params.append(store_id)

            query += " GROUP BY p.product_id, p.name, p.code, st.store_name ORDER BY p.name"

            cursor.execute(query, params)
            result = cursor.fetchall()
            return result
    except Exception as e:
        print(f"獲取庫存記錄錯誤: {e}")
        return []
    finally:
        conn.close()

def search_inventory(keyword, store_id=None):
    """搜尋庫存記錄，可依店鋪篩選"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT
                    MAX(i.inventory_id) AS Inventory_ID,
                    p.product_id AS Product_ID,
                    p.name AS ProductName, 
                    p.code AS ProductCode, 
                    SUM(i.quantity) AS StockQuantity,
                    SUM(IFNULL(i.stock_in, 0)) AS StockIn,
                    SUM(IFNULL(i.stock_out, 0)) AS StockOut,
                    SUM(IFNULL(i.stock_loan, 0)) AS StockLoan,
                    MAX(i.store_id) AS Store_ID,
                    st.store_name AS StoreName,
                    MAX(IFNULL(i.stock_threshold, 5)) AS StockThreshold,
                    MAX(i.date) AS StockInTime
                FROM inventory i
                LEFT JOIN product p ON i.product_id = p.product_id
                LEFT JOIN store st ON i.store_id = st.store_id
                WHERE (p.name LIKE %s OR p.code LIKE %s)
            """
            params = [f"%{keyword}%", f"%{keyword}%"]
            if store_id:
                query += " AND i.store_id = %s"
                params.append(store_id)

            query += " GROUP BY p.product_id, p.name, p.code, st.store_name ORDER BY p.name"

            cursor.execute(query, params)
            result = cursor.fetchall()
            return result
    except Exception as e:
        print(f"搜尋庫存記錄錯誤: {e}")
        return []
    finally:
        conn.close()

def get_inventory_by_id(inventory_id):
    """根據ID獲取庫存記錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 首先獲取特定的庫存記錄
            query = """
                SELECT 
                    i.inventory_id AS Inventory_ID, 
                    p.product_id AS Product_ID, 
                    p.name AS ProductName, 
                    p.code AS ProductCode, 
                    i.quantity AS ItemQuantity,
                    i.stock_in AS StockIn,
                    i.stock_out AS StockOut,
                    i.stock_loan AS StockLoan,
                    i.stock_threshold AS StockThreshold,
                    i.store_id AS Store_ID,
                    st.store_name AS StoreName,
                    i.date AS StockInTime,
                    s.name AS StaffName,
                    i.staff_id AS Staff_ID
                FROM inventory i
                LEFT JOIN product p ON i.product_id = p.product_id
                LEFT JOIN staff s ON i.staff_id = s.staff_id
                LEFT JOIN store st ON i.store_id = st.store_id
                WHERE i.inventory_id = %s
            """
            cursor.execute(query, (inventory_id,))
            result = cursor.fetchone()
            
            if result:
                product_id = result['Product_ID']
                
                # 計算此產品的總庫存量
                query_total = """
                    SELECT 
                        SUM(quantity) AS StockQuantity,
                        SUM(IFNULL(stock_in, 0)) AS TotalStockIn,
                        SUM(IFNULL(stock_out, 0)) AS TotalStockOut,
                        SUM(IFNULL(stock_loan, 0)) AS TotalStockLoan
                    FROM inventory
                    WHERE product_id = %s
                """
                cursor.execute(query_total, (product_id,))
                total = cursor.fetchone()
                
                if total:
                    result['StockQuantity'] = total['StockQuantity'] or 0
                    result['TotalStockIn'] = total['TotalStockIn'] or 0
                    result['TotalStockOut'] = total['TotalStockOut'] or 0
                    result['TotalStockLoan'] = total['TotalStockLoan'] or 0
                
            return result
    except Exception as e:
        print(f"獲取庫存記錄詳細信息錯誤: {e}")
        return None
    finally:
        conn.close()

def get_low_stock_inventory(store_id=None):
    """獲取低於閾值的庫存記錄，可依店鋪篩選"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT
                    MAX(i.inventory_id) AS Inventory_ID,
                    p.product_id AS Product_ID,
                    p.name AS ProductName, 
                    p.code AS ProductCode, 
                    SUM(i.quantity) AS StockQuantity,
                    SUM(IFNULL(i.stock_in, 0)) AS StockIn,
                    SUM(IFNULL(i.stock_out, 0)) AS StockOut,
                    SUM(IFNULL(i.stock_loan, 0)) AS StockLoan,
                    MAX(i.store_id) AS Store_ID,
                    st.store_name AS StoreName,
                    MAX(IFNULL(i.stock_threshold, 5)) AS StockThreshold,
                    MAX(i.date) AS StockInTime
                FROM inventory i
                LEFT JOIN product p ON i.product_id = p.product_id
                LEFT JOIN store st ON i.store_id = st.store_id
            """
            params = []
            if store_id:
                query += " WHERE i.store_id = %s"
                params.append(store_id)

            query += " GROUP BY p.product_id, p.name, p.code, st.store_name HAVING SUM(i.quantity) <= MAX(IFNULL(i.stock_threshold, 5)) ORDER BY (SUM(i.quantity) / MAX(IFNULL(i.stock_threshold, 5))) ASC, p.name"

            cursor.execute(query, params)
            results = cursor.fetchall()
            return results
    except Exception as e:
        print(f"獲取低庫存記錄錯誤: {e}")
        return []
    finally:
        conn.close()

def get_inventory_history(store_id=None, start_date=None, end_date=None):
    """獲取庫存進出明細，可依店鋪及日期區間篩選。
    為了同時呈現銷售(產品與療程)造成的庫存變化，
    此函式會合併 inventory、product_sell 以及 therapy_sell 的紀錄。"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            records = []

            # -------- 庫存異動記錄 --------
            base_q = """
                SELECT
                    i.inventory_id AS Inventory_ID,
                    p.name AS Name,
                    NULL AS Unit,
                    p.price AS Price,
                    i.quantity AS quantity,
                    i.stock_in,
                    i.stock_out,
                    i.stock_loan,
                    i.stock_threshold AS StockThreshold,
                    i.date AS Date,
                    s.name AS StaffName,
                    st.store_name AS StoreName,
                    '' AS SaleStaff,
                    '' AS Voucher
                FROM inventory i
                LEFT JOIN product p ON i.product_id = p.product_id
                LEFT JOIN staff s ON i.staff_id = s.staff_id
                LEFT JOIN store st ON i.store_id = st.store_id
            """
            params = []
            conditions = []
            if store_id:
                conditions.append("i.store_id = %s")
                params.append(store_id)
            if start_date:
                conditions.append("i.date >= %s")
                params.append(start_date)
            if end_date:
                conditions.append("i.date <= %s")
                params.append(end_date)
            if conditions:
                base_q += " WHERE " + " AND ".join(conditions)
            cursor.execute(base_q, params)
            records.extend(cursor.fetchall())

            # -------- 產品銷售紀錄 --------
            prod_q = """
                SELECT
                    ps.product_sell_id + 1000000 AS Inventory_ID,
                    p.name AS Name,
                    NULL AS Unit,
                    ps.unit_price AS Price,
                    -ps.quantity AS quantity,
                    0 AS stock_in,
                    ps.quantity AS stock_out,
                    0 AS stock_loan,
                    ps.date AS Date,
                    '' AS StaffName,
                    st.store_name AS StoreName,
                    sf.name AS SaleStaff,
                    ps.product_sell_id AS Voucher
                FROM product_sell ps
                LEFT JOIN product p ON ps.product_id = p.product_id
                LEFT JOIN staff sf ON ps.staff_id = sf.staff_id
                LEFT JOIN store st ON ps.store_id = st.store_id
            """
            params = []
            conditions = []
            if store_id:
                conditions.append("ps.store_id = %s")
                params.append(store_id)
            if start_date:
                conditions.append("ps.date >= %s")
                params.append(start_date)
            if end_date:
                conditions.append("ps.date <= %s")
                params.append(end_date)
            if conditions:
                prod_q += " WHERE " + " AND ".join(conditions)
            cursor.execute(prod_q, params)
            records.extend(cursor.fetchall())
            # -------- 療程銷售紀錄 --------
            therapy_q = """
                SELECT
                    ts.therapy_sell_id + 2000000 AS Inventory_ID,
                    t.name AS Name,
                    NULL AS Unit,
                    t.price AS Price,
                    -ts.amount AS quantity,
                    0 AS stock_in,
                    ts.amount AS stock_out,
                    0 AS stock_loan,
                    ts.date AS Date,
                    '' AS StaffName,
                    st.store_name AS StoreName,
                    sf.name AS SaleStaff,
                    ts.therapy_sell_id AS Voucher
                FROM therapy_sell ts
                LEFT JOIN therapy t ON ts.therapy_id = t.therapy_id
                LEFT JOIN staff sf ON ts.staff_id = sf.staff_id
                LEFT JOIN store st ON ts.store_id = st.store_id
            """
            params = []
            conditions = []
            if store_id:
                conditions.append("ts.store_id = %s")
                params.append(store_id)
            if start_date:
                conditions.append("ts.date >= %s")
                params.append(start_date)
            if end_date:
                conditions.append("ts.date <= %s")
                params.append(end_date)
            if conditions:
                therapy_q += " WHERE " + " AND ".join(conditions)
            cursor.execute(therapy_q, params)
            records.extend(cursor.fetchall())
            
            # 依日期與ID倒序排列
            records.sort(key=lambda x: (x.get('Date'), x.get('Inventory_ID')), reverse=True)
            return records
    except Exception as e:
        print(f"獲取庫存進出明細錯誤: {e}")
        return []
    finally:
        conn.close()

def update_inventory_item(inventory_id, data):
    """更新庫存記錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 首先獲取現有記錄以確定 product_id
            query_get = "SELECT * FROM inventory WHERE inventory_id = %s"
            cursor.execute(query_get, (inventory_id,))
            existing = cursor.fetchone()
            
            if not existing:
                return False
                
            # 更新庫存記錄
            query = """
                UPDATE inventory 
                SET 
                    quantity = %s,
                    stock_in = %s,
                    stock_out = %s,
                    stock_loan = %s,
                    stock_threshold = %s,
                    store_id = %s,
                    staff_id = %s,
                    date = %s
                WHERE inventory_id = %s
            """
            
            values = (
                data.get('quantity', existing['quantity']),
                data.get('stock_in', existing['stock_in']),
                data.get('stock_out', existing['stock_out']),
                data.get('stock_loan', existing['stock_loan']),
                data.get('stock_threshold', existing['stock_threshold']),
                data.get('store_id', existing['store_id']),
                data.get('staff_id', existing['staff_id']),
                data.get('date', existing['date']),
                inventory_id
            )
            
            cursor.execute(query, values)
            
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"更新庫存記錄錯誤: {e}")
        return False
    finally:
        conn.close()

def add_inventory_item(data):
    """新增庫存記錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                INSERT INTO inventory (
                    product_id, staff_id, date, quantity, 
                    stock_in, stock_out, stock_loan, 
                    stock_threshold, store_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            # 從請求中擷取數據
            product_id = data.get('productId')
            staff_id = data.get('staffId', 1)  # 預設管理員 ID
            date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
            
            # 確定庫存變動類型
            quantity = int(data.get('quantity', 0))
            stock_in = int(data.get('stockIn', 0)) if quantity >= 0 else 0
            stock_out = int(data.get('stockOut', 0)) if quantity < 0 else 0
            stock_loan = int(data.get('stockLoan', 0))
            
            # 其他欄位
            stock_threshold = data.get('stockThreshold', 5)
            store_id = data.get('storeId', 1)  # 預設店鋪 ID
            
            values = (
                product_id, staff_id, date, quantity, 
                stock_in, stock_out, stock_loan, 
                stock_threshold, store_id
            )
            
            cursor.execute(query, values)
            
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"新增庫存記錄錯誤: {e}")
        return False
    finally:
        conn.close()

def delete_inventory_item(inventory_id):
    """刪除庫存記錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = "DELETE FROM inventory WHERE inventory_id = %s"
            cursor.execute(query, (inventory_id,))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"刪除庫存記錄錯誤: {e}")
        return False
    finally:
        conn.close()

def get_product_list():
    """獲取所有產品列表（用於庫存管理）"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT 
                    p.product_id AS Product_ID, 
                    p.name AS ProductName, 
                    p.code AS ProductCode, 
                    p.price AS ProductPrice
                FROM product p
                ORDER BY p.name
            """
            cursor.execute(query)
            result = cursor.fetchall()
            return result
    except Exception as e:
        print(f"獲取產品列表錯誤: {e}")
        return []
    finally:
        conn.close()

def get_store_list():
    """獲取所有店鋪列表（用於庫存管理）"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT 
                    store_id AS Store_ID, 
                    store_name AS StoreName
                FROM store
                ORDER BY store_name
            """
            cursor.execute(query)
            result = cursor.fetchall()
            return result
    except Exception as e:
        print(f"獲取店鋪列表錯誤: {e}")
        return []
    finally:
        conn.close()

def export_inventory_data(store_id=None):
    """匯出庫存資料，可依店鋪篩選"""
    # 這個功能會在路由層處理實際的 Excel 產生
    return get_all_inventory(store_id)