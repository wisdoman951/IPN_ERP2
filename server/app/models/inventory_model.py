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
                    p.unit AS Unit,
                    p.category AS Category,
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


def get_inventory_transactions(store_id=None, start_date=None, end_date=None):
    """取得庫存進出明細"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT
                    i.inventory_id AS Inventory_ID,
                    p.product_id AS Product_ID,
                    p.name AS ProductName,
                    p.unit AS Unit,
                    p.category AS Category,
                    i.stock_in AS StockIn,
                    i.stock_out AS StockOut,
                    i.stock_loan AS StockLoan,
                    i.quantity AS Quantity,
                    i.date AS Date,
                    st.store_name AS StoreName,
                    s.name AS StaffName
                FROM inventory i
                LEFT JOIN product p ON i.product_id = p.product_id
                LEFT JOIN store st ON i.store_id = st.store_id
                LEFT JOIN staff s ON i.staff_id = s.staff_id
            """
            conditions = []
            params = []
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
                query += " WHERE " + " AND ".join(conditions)

            query += " ORDER BY i.date DESC, i.inventory_id DESC"
            cursor.execute(query, params)
            result = cursor.fetchall()
            return result
    except Exception as e:
        print(f"獲取庫存進出明細錯誤: {e}")
        return []
    finally:
        conn.close()


def analyze_inventory(store_id=None, start_date=None, end_date=None):
    """庫存分析：包括預警門檻與銷售數量"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT
                    p.product_id AS Product_ID,
                    p.name AS ProductName,
                    p.unit AS Unit,
                    p.category AS Category,
                    COALESCE(SUM(i.quantity), 0) AS StockQuantity,
                    MAX(IFNULL(i.stock_threshold, 5)) AS StockThreshold,
                    COALESCE(SUM(ps.quantity), 0) AS SaleQuantity
                FROM product p
                LEFT JOIN inventory i ON p.product_id = i.product_id
                    {store_filter_i}
                LEFT JOIN product_sell ps ON p.product_id = ps.product_id
                    {store_filter_ps}
            """
            store_filter_i = ""
            store_filter_ps = ""
            params = []
            if store_id:
                store_filter_i = "AND i.store_id = %s"
                store_filter_ps = "AND ps.store_id = %s"
                params.extend([store_id, store_id])
            else:
                params.extend([])

            conditions = []
            if start_date:
                conditions.append("ps.date >= %s")
                params.append(start_date)
            if end_date:
                conditions.append("ps.date <= %s")
                params.append(end_date)

            query = query.format(store_filter_i=store_filter_i, store_filter_ps=store_filter_ps)
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            query += " GROUP BY p.product_id, p.name, p.unit, p.category ORDER BY p.name"
            cursor.execute(query, params)
            results = cursor.fetchall()
            for item in results:
                item["Unsold"] = item["SaleQuantity"] == 0
            return results
    except Exception as e:
        print(f"庫存分析錯誤: {e}")
        return []
    finally:
        conn.close()