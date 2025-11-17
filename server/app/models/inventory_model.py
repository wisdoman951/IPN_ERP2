import pymysql
from pymysql import MySQLError
from functools import lru_cache
from app.config import DB_CONFIG
from datetime import datetime


def _normalize_legacy_rows(rows):
    for row in rows:
        stock_in = row.get('StockIn') or 0
        stock_qty = row.get('StockQuantity') or 0
        row['StockIn'] = stock_in
        row['StockQuantity'] = stock_qty
        row['StockOut'] = stock_in - stock_qty
        row['StockLoan'] = row.get('StockLoan') or 0
        row['StockThreshold'] = row.get('StockThreshold') or 0
        row['IsMaster'] = row.get('IsMaster') or 0
        row['MasterProduct_ID'] = row.get('MasterProduct_ID')
        last_sold = row.get('LastSoldTime') or row.get('StockInTime')
        if isinstance(last_sold, datetime):
            row['UnsoldDays'] = (datetime.now() - last_sold).days
        else:
            row['UnsoldDays'] = None
    return rows


def _normalize_date_for_sort(value):
    """將資料列中的日期欄位轉換為可排序的 datetime 物件。"""
    if isinstance(value, datetime):
        return value

    if isinstance(value, str):
        text = value.strip()
        if not text:
            return datetime.min

        # 嘗試以 ISO 格式解析 (支援 `YYYY-MM-DD`, `YYYY-MM-DD HH:MM:SS`, `YYYY-MM-DDTHH:MM:SS` 等)
        try:
            sanitized = text.replace('Z', '+00:00')
            return datetime.fromisoformat(sanitized)
        except ValueError:
            pass

        # 若失敗則再試著使用常見格式
        for fmt in ("%Y/%m/%d", "%Y/%m/%d %H:%M:%S"):
            try:
                return datetime.strptime(text, fmt)
            except ValueError:
                continue

    return datetime.min


def _fetch_master_inventory_rows(cursor, store_id=None, keyword=None):
    rows = []
    if store_id:
        query = """
            SELECT
                (mp.master_product_id * 1000000 + %s) AS Inventory_ID,
                mp.master_product_id AS Product_ID,
                mp.master_product_id AS MasterProduct_ID,
                mp.name AS ProductName,
                mp.master_product_code AS ProductCode,
                COALESCE(ms.quantity_on_hand, 0) AS StockQuantity,
                COALESCE(tx.total_inbound, 0) AS StockIn,
                COALESCE(tx.total_outbound, 0) AS StockOut,
                0 AS StockLoan,
                %s AS Store_ID,
                COALESCE(st.store_name, '未指定門市') AS StoreName,
                5 AS StockThreshold,
                COALESCE(tx.last_inbound_time, ms.updated_at) AS StockInTime,
                tx.last_outbound_time AS LastSoldTime,
                COALESCE(tx.total_outbound, 0) AS SoldQuantity,
                1 AS IsMaster
            FROM master_product mp
            LEFT JOIN master_stock ms
                   ON ms.master_product_id = mp.master_product_id
                  AND ms.store_id = %s
            LEFT JOIN (
                SELECT master_product_id,
                       SUM(CASE WHEN txn_type = 'INBOUND' THEN quantity ELSE 0 END) AS total_inbound,
                       SUM(CASE WHEN txn_type = 'OUTBOUND' THEN -quantity ELSE 0 END) AS total_outbound,
                       MAX(CASE WHEN txn_type = 'INBOUND' THEN created_at END) AS last_inbound_time,
                       MAX(CASE WHEN txn_type = 'OUTBOUND' THEN created_at END) AS last_outbound_time
                FROM stock_transaction
                WHERE store_id = %s
                GROUP BY master_product_id
            ) tx ON tx.master_product_id = mp.master_product_id
            LEFT JOIN store st ON st.store_id = %s
            WHERE mp.status = 'ACTIVE'
        """
        params = [store_id, store_id, store_id, store_id, store_id]
        if keyword:
            query += " AND (mp.name LIKE %s OR mp.master_product_code LIKE %s)"
            like = f"%{keyword}%"
            params.extend([like, like])
        query += " ORDER BY mp.name"
        cursor.execute(query, params)
        rows = cursor.fetchall()
    else:
        query = """
            SELECT
                (mp.master_product_id * 1000000 + COALESCE(ms.store_id, 0)) AS Inventory_ID,
                mp.master_product_id AS Product_ID,
                mp.master_product_id AS MasterProduct_ID,
                mp.name AS ProductName,
                mp.master_product_code AS ProductCode,
                COALESCE(ms.quantity_on_hand, 0) AS StockQuantity,
                COALESCE(tx.total_inbound, 0) AS StockIn,
                COALESCE(tx.total_outbound, 0) AS StockOut,
                0 AS StockLoan,
                COALESCE(ms.store_id, tx.store_id, 0) AS Store_ID,
                COALESCE(st.store_name, '未指定門市') AS StoreName,
                5 AS StockThreshold,
                COALESCE(tx.last_inbound_time, ms.updated_at) AS StockInTime,
                tx.last_outbound_time AS LastSoldTime,
                COALESCE(tx.total_outbound, 0) AS SoldQuantity,
                1 AS IsMaster
            FROM master_product mp
            LEFT JOIN master_stock ms
                   ON ms.master_product_id = mp.master_product_id
            LEFT JOIN (
                SELECT master_product_id,
                       store_id,
                       SUM(CASE WHEN txn_type = 'INBOUND' THEN quantity ELSE 0 END) AS total_inbound,
                       SUM(CASE WHEN txn_type = 'OUTBOUND' THEN -quantity ELSE 0 END) AS total_outbound,
                       MAX(CASE WHEN txn_type = 'INBOUND' THEN created_at END) AS last_inbound_time,
                       MAX(CASE WHEN txn_type = 'OUTBOUND' THEN created_at END) AS last_outbound_time
                FROM stock_transaction
                GROUP BY master_product_id, store_id
            ) tx ON tx.master_product_id = mp.master_product_id
               AND (tx.store_id = ms.store_id OR ms.store_id IS NULL)
            LEFT JOIN store st ON st.store_id = COALESCE(ms.store_id, tx.store_id)
            WHERE mp.status = 'ACTIVE'
        """
        params = []
        if keyword:
            query += " AND (mp.name LIKE %s OR mp.master_product_code LIKE %s)"
            like = f"%{keyword}%"
            params.extend([like, like])
        query += " ORDER BY mp.name, COALESCE(ms.store_id, tx.store_id)"
        cursor.execute(query, params)
        rows = cursor.fetchall()

    for row in rows:
        row['StockIn'] = row.get('StockIn') or 0
        row['StockOut'] = row.get('StockOut') or 0
        row['StockLoan'] = 0
        row['StockQuantity'] = row.get('StockQuantity') or 0
        row['StockThreshold'] = row.get('StockThreshold') or 0
        row['IsMaster'] = 1
        row['UnsoldDays'] = None
    return rows

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
                    NULL AS MasterProduct_ID,
                    p.name AS ProductName,
                    p.code AS ProductCode,
                    SUM(i.quantity) AS StockQuantity,
                    SUM(IFNULL(i.stock_in, 0)) AS StockIn,
                    SUM(IFNULL(i.stock_out, 0)) AS StockOut,
                    SUM(IFNULL(i.stock_loan, 0)) AS StockLoan,
                    MAX(i.store_id) AS Store_ID,
                    st.store_name AS StoreName,
                    MAX(IFNULL(i.stock_threshold, 5)) AS StockThreshold,
                    COALESCE(MAX(sales.total_sold), 0) AS SoldQuantity,
                    MAX(sales.last_sold) AS LastSoldTime,
                    MAX(i.date) AS StockInTime,
                    0 AS IsMaster
                FROM inventory i
                LEFT JOIN product p ON i.product_id = p.product_id
                LEFT JOIN store st ON i.store_id = st.store_id
                LEFT JOIN (
                    SELECT product_id AS item_id, store_id,
                           SUM(quantity) AS total_sold,
                           MAX(date) AS last_sold
                    FROM product_sell
                    GROUP BY product_id, store_id
                    UNION ALL
                    SELECT therapy_id AS item_id, store_id,
                           SUM(amount) AS total_sold,
                           MAX(date) AS last_sold
                    FROM therapy_sell
                    GROUP BY therapy_id, store_id
                ) sales ON sales.item_id = i.product_id AND sales.store_id = i.store_id
            """
            params = []
            if store_id:
                query += " WHERE i.store_id = %s"
                params.append(store_id)

            query += " GROUP BY p.product_id, p.name, p.code, st.store_name ORDER BY p.name"

            cursor.execute(query, params)
            result = list(cursor.fetchall())   # 👈 強制轉成 list
            result = _normalize_legacy_rows(result)

            # ✅ 正確：這裡用同一個 cursor 去抓 master rows
            master_rows = _fetch_master_inventory_rows(cursor, store_id)
            result.extend(master_rows)
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
                    NULL AS MasterProduct_ID,
                    p.name AS ProductName,
                    p.code AS ProductCode,
                    SUM(i.quantity) AS StockQuantity,
                    SUM(IFNULL(i.stock_in, 0)) AS StockIn,
                    SUM(IFNULL(i.stock_out, 0)) AS StockOut,
                    SUM(IFNULL(i.stock_loan, 0)) AS StockLoan,
                    MAX(i.store_id) AS Store_ID,
                    st.store_name AS StoreName,
                    MAX(IFNULL(i.stock_threshold, 5)) AS StockThreshold,
                    COALESCE(MAX(sales.total_sold), 0) AS SoldQuantity,
                    MAX(sales.last_sold) AS LastSoldTime,
                    MAX(i.date) AS StockInTime,
                    0 AS IsMaster
                FROM inventory i
                LEFT JOIN product p ON i.product_id = p.product_id
                LEFT JOIN store st ON i.store_id = st.store_id
                LEFT JOIN (
                    SELECT product_id AS item_id, store_id,
                           SUM(quantity) AS total_sold,
                           MAX(date) AS last_sold
                    FROM product_sell
                    GROUP BY product_id, store_id
                    UNION ALL
                    SELECT therapy_id AS item_id, store_id,
                           SUM(amount) AS total_sold,
                           MAX(date) AS last_sold
                    FROM therapy_sell
                    GROUP BY therapy_id, store_id
                ) sales ON sales.item_id = i.product_id AND sales.store_id = i.store_id
                WHERE (p.name LIKE %s OR p.code LIKE %s)
            """
            params = [f"%{keyword}%", f"%{keyword}%"]
            if store_id:
                query += " AND i.store_id = %s"
                params.append(store_id)

            query += " GROUP BY p.product_id, p.name, p.code, st.store_name ORDER BY p.name"

            cursor.execute(query, params)
            result = cursor.fetchall()
            result = _normalize_legacy_rows(result)

            # ✅ 一樣用同一個 cursor 抓 master rows + keyword
            master_rows = _fetch_master_inventory_rows(cursor, store_id, keyword)
            result.extend(master_rows)
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
                    i.staff_id AS Staff_ID,
                    i.supplier AS Supplier,
                    i.buyer AS Buyer,
                    i.voucher AS Voucher,
                    i.note AS note
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
                    COALESCE(MAX(sales.total_sold), 0) AS SoldQuantity,
                    MAX(i.date) AS StockInTime
                FROM inventory i
                LEFT JOIN product p ON i.product_id = p.product_id
                LEFT JOIN store st ON i.store_id = st.store_id
                LEFT JOIN (
                    SELECT product_id AS item_id, store_id, SUM(quantity) AS total_sold
                    FROM product_sell
                    GROUP BY product_id, store_id
                    UNION ALL
                    SELECT therapy_id AS item_id, store_id, SUM(amount) AS total_sold
                    FROM therapy_sell
                    GROUP BY therapy_id, store_id
                ) sales ON sales.item_id = i.product_id AND sales.store_id = i.store_id
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

def get_inventory_history(store_id=None, start_date=None, end_date=None,
                          sale_staff=None, buyer=None, product_id=None,
                          master_product_id=None):
    """獲取庫存進出明細，可依店鋪、日期區間、銷售人、購買人與產品篩選。
    為了同時呈現銷售(產品與療程)造成的庫存變化，
    此函式會合併 inventory、product_sell、therapy_sell 以及 stock_transaction 的紀錄。"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            records = []
            derived_master_id = master_product_id
            if derived_master_id is None and product_id:
                cursor.execute(
                    "SELECT master_product_id FROM product_variant WHERE variant_id = %s",
                    (product_id,)
                )
                mapped = cursor.fetchone()
                if mapped:
                    derived_master_id = mapped['master_product_id']

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
                    i.supplier AS Supplier,
                    st.store_name AS StoreName,
                    '' AS SaleStaff,
                    i.buyer AS Buyer,
                    i.voucher AS Voucher,
                    '庫存' AS Category,
                    CASE
                        WHEN i.stock_in > 0 AND COALESCE(i.stock_out, 0) = 0 THEN '入庫'
                        WHEN i.stock_out > 0 THEN '出庫'
                        WHEN i.stock_loan > 0 THEN '借出'
                        ELSE '調整'
                    END AS TxnType
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
            if product_id:
                conditions.append("i.product_id = %s")
                params.append(product_id)
            if buyer:
                conditions.append("i.buyer LIKE %s")
                params.append(f"%{buyer}%")
            if conditions:
                base_q += " WHERE " + " AND ".join(conditions)
            cursor.execute(base_q, params)
            records.extend(cursor.fetchall())

            # -------- 產品銷售紀錄 --------
            # 產品銷售紀錄：需同時處理一般銷售與尚未拆解之套組項目
            base_conditions = []
            base_params = []
            if store_id:
                base_conditions.append("ps.store_id = %s")
                base_params.append(store_id)
            if start_date:
                base_conditions.append("ps.date >= %s")
                base_params.append(start_date)
            if end_date:
                base_conditions.append("ps.date <= %s")
                base_params.append(end_date)
            if sale_staff:
                base_conditions.append("sf.name LIKE %s")
                base_params.append(f"%{sale_staff}%")
            if buyer:
                base_conditions.append("mb.name LIKE %s")
                base_params.append(f"%{buyer}%")
            if product_id:
                base_conditions.append("ps.product_id = %s")
                base_params.append(product_id)
            base_conditions.append("(ps.product_id IS NOT NULL OR ps.note NOT LIKE '%%[bundle:%%')")
            base_where = " WHERE " + " AND ".join(base_conditions)

            bundle_conditions = []
            bundle_params = []
            if store_id:
                bundle_conditions.append("ps.store_id = %s")
                bundle_params.append(store_id)
            if start_date:
                bundle_conditions.append("ps.date >= %s")
                bundle_params.append(start_date)
            if end_date:
                bundle_conditions.append("ps.date <= %s")
                bundle_params.append(end_date)
            if sale_staff:
                bundle_conditions.append("sf.name LIKE %s")
                bundle_params.append(f"%{sale_staff}%")
            if buyer:
                bundle_conditions.append("mb.name LIKE %s")
                bundle_params.append(f"%{buyer}%")
            if product_id:
                bundle_conditions.append("pbi.item_id = %s")
                bundle_params.append(product_id)
            bundle_conditions.append("ps.product_id IS NULL")
            bundle_conditions.append("ps.note LIKE '%%[bundle:%%'")
            bundle_where = " WHERE " + " AND ".join(bundle_conditions)

            prod_base_q = f"""
                SELECT
                    ps.product_sell_id + 1000000 AS Inventory_ID,
                    COALESCE(p.name, ps.product_name) AS Name,
                    NULL AS Unit,
                    ps.unit_price AS Price,
                    -ps.quantity AS quantity,
                    0 AS stock_in,
                    ps.quantity AS stock_out,
                    0 AS stock_loan,
                    ps.date AS Date,
                    '' AS StaffName,
                    '' AS Supplier,
                    st.store_name AS StoreName,
                    sf.name AS SaleStaff,
                    mb.name AS Buyer,
                    '' AS Voucher,
                    CASE WHEN ps.note LIKE '%%[bundle:%%' THEN '套組銷售' ELSE '產品銷售' END AS Category,
                    '銷售出庫' AS TxnType
                FROM product_sell ps
                LEFT JOIN product p ON ps.product_id = p.product_id
                LEFT JOIN staff sf ON ps.staff_id = sf.staff_id
                LEFT JOIN store st ON ps.store_id = st.store_id
                LEFT JOIN member mb ON ps.member_id = mb.member_id
                {base_where}
            """
            cursor.execute(prod_base_q, base_params)
            records.extend(cursor.fetchall())

            prod_bundle_q = f"""
                SELECT
                    ps.product_sell_id + 1000000 + pbi.item_id AS Inventory_ID,
                    pr.name AS Name,
                    NULL AS Unit,
                    pr.price AS Price,
                    -(ps.quantity * pbi.quantity) AS quantity,
                    0 AS stock_in,
                    ps.quantity * pbi.quantity AS stock_out,
                    0 AS stock_loan,
                    ps.date AS Date,
                    '' AS StaffName,
                    '' AS Supplier,
                    st.store_name AS StoreName,
                    sf.name AS SaleStaff,
                    mb.name AS Buyer,
                    '' AS Voucher,
                    '套組銷售' AS Category,
                    '銷售出庫' AS TxnType
                FROM product_sell ps
                JOIN product_bundle_items pbi
                  ON pbi.bundle_id = SUBSTRING_INDEX(SUBSTRING(ps.note, LOCATE('[bundle:', ps.note) + 8), ']', 1)
                 AND pbi.item_type = 'Product'
                LEFT JOIN product pr ON pbi.item_id = pr.product_id
                LEFT JOIN staff sf ON ps.staff_id = sf.staff_id
                LEFT JOIN store st ON ps.store_id = st.store_id
                LEFT JOIN member mb ON ps.member_id = mb.member_id
                {bundle_where}
            """
            cursor.execute(prod_bundle_q, bundle_params)
            records.extend(cursor.fetchall())
            
            # -------- 療程銷售紀錄 --------
            # 療程銷售紀錄：同樣處理一般與套組項目
            t_base_conditions = []
            t_base_params = []
            if store_id:
                t_base_conditions.append("ts.store_id = %s")
                t_base_params.append(store_id)
            if start_date:
                t_base_conditions.append("ts.date >= %s")
                t_base_params.append(start_date)
            if end_date:
                t_base_conditions.append("ts.date <= %s")
                t_base_params.append(end_date)
            if sale_staff:
                t_base_conditions.append("sf.name LIKE %s")
                t_base_params.append(f"%{sale_staff}%")
            if buyer:
                t_base_conditions.append("mb.name LIKE %s")
                t_base_params.append(f"%{buyer}%")
            if product_id:
                t_base_conditions.append("ts.therapy_id = %s")
                t_base_params.append(product_id)
            t_base_conditions.append("(ts.therapy_id IS NOT NULL OR ts.note NOT LIKE '%%[bundle:%%')")
            t_base_where = " WHERE " + " AND ".join(t_base_conditions)

            t_bundle_conditions = []
            t_bundle_params = []
            if store_id:
                t_bundle_conditions.append("ts.store_id = %s")
                t_bundle_params.append(store_id)
            if start_date:
                t_bundle_conditions.append("ts.date >= %s")
                t_bundle_params.append(start_date)
            if end_date:
                t_bundle_conditions.append("ts.date <= %s")
                t_bundle_params.append(end_date)
            if sale_staff:
                t_bundle_conditions.append("sf.name LIKE %s")
                t_bundle_params.append(f"%{sale_staff}%")
            if buyer:
                t_bundle_conditions.append("mb.name LIKE %s")
                t_bundle_params.append(f"%{buyer}%")
            if product_id:
                t_bundle_conditions.append("tbi.item_id = %s")
                t_bundle_params.append(product_id)
            t_bundle_conditions.append("ts.therapy_id IS NULL")
            t_bundle_conditions.append("ts.note LIKE '%%[bundle:%%'")
            t_bundle_where = " WHERE " + " AND ".join(t_bundle_conditions)

            therapy_base_q = f"""
                SELECT
                    ts.therapy_sell_id + 2000000 AS Inventory_ID,
                    COALESCE(t.name, ts.therapy_name) AS Name,
                    NULL AS Unit,
                    t.price AS Price,
                    -ts.amount AS quantity,
                    0 AS stock_in,
                    ts.amount AS stock_out,
                    0 AS stock_loan,
                    ts.date AS Date,
                    '' AS StaffName,
                    '' AS Supplier,
                    st.store_name AS StoreName,
                    sf.name AS SaleStaff,
                    mb.name AS Buyer,
                    '' AS Voucher,
                    CASE WHEN ts.note LIKE '%%[bundle:%%' THEN '套組銷售' ELSE '療程銷售' END AS Category,
                    '銷售出庫' AS TxnType
                FROM therapy_sell ts
                LEFT JOIN therapy t ON ts.therapy_id = t.therapy_id
                LEFT JOIN staff sf ON ts.staff_id = sf.staff_id
                LEFT JOIN store st ON ts.store_id = st.store_id
                LEFT JOIN member mb ON ts.member_id = mb.member_id
                {t_base_where}
            """
            cursor.execute(therapy_base_q, t_base_params)
            records.extend(cursor.fetchall())

            therapy_bundle_q = f"""
                SELECT
                    ts.therapy_sell_id + 2000000 + tbi.item_id AS Inventory_ID,
                    th.name AS Name,
                    NULL AS Unit,
                    th.price AS Price,
                    -(ts.amount * tbi.quantity) AS quantity,
                    0 AS stock_in,
                    ts.amount * tbi.quantity AS stock_out,
                    0 AS stock_loan,
                    ts.date AS Date,
                    '' AS StaffName,
                    '' AS Supplier,
                    st.store_name AS StoreName,
                    sf.name AS SaleStaff,
                    mb.name AS Buyer,
                    '' AS Voucher,
                    '套組銷售' AS Category,
                    '銷售出庫' AS TxnType
                FROM therapy_sell ts
                JOIN therapy_bundle_items tbi
                  ON tbi.bundle_id = SUBSTRING_INDEX(SUBSTRING(ts.note, LOCATE('[bundle:', ts.note) + 8), ']', 1)
                LEFT JOIN therapy th ON tbi.item_id = th.therapy_id
                LEFT JOIN staff sf ON ts.staff_id = sf.staff_id
                LEFT JOIN store st ON ts.store_id = st.store_id
                LEFT JOIN member mb ON ts.member_id = mb.member_id
                {t_bundle_where}
            """
            cursor.execute(therapy_bundle_q, t_bundle_params)
            records.extend(cursor.fetchall())

            txn_conditions = ["stx.txn_type IN ('INBOUND','OUTBOUND')"]
            txn_params = []
            if store_id:
                txn_conditions.append("stx.store_id = %s")
                txn_params.append(store_id)
            if start_date:
                txn_conditions.append("DATE(stx.created_at) >= %s")
                txn_params.append(start_date)
            if end_date:
                txn_conditions.append("DATE(stx.created_at) <= %s")
                txn_params.append(end_date)
            if derived_master_id:
                txn_conditions.append("stx.master_product_id = %s")
                txn_params.append(derived_master_id)
            txn_where = " WHERE " + " AND ".join(txn_conditions)
            txn_query = f"""
                SELECT
                    stx.txn_id + 3000000 AS Inventory_ID,
                    mp.name AS Name,
                    NULL AS Unit,
                    NULL AS Price,
                    stx.quantity AS quantity,
                    NULL AS stock_in,
                    NULL AS stock_out,
                    NULL AS stock_loan,
                    NULL AS StockThreshold,
                    stx.created_at AS Date,
                    sf.name AS StaffName,
                    NULL AS Supplier,
                    st.store_name AS StoreName,
                    '' AS SaleStaff,
                    NULL AS Buyer,
                    stx.reference_no AS Voucher,
                    CASE WHEN stx.txn_type = 'INBOUND' THEN '進貨' ELSE '出貨' END AS Category
                FROM stock_transaction stx
                JOIN master_product mp ON mp.master_product_id = stx.master_product_id
                LEFT JOIN staff sf ON sf.staff_id = stx.staff_id
                LEFT JOIN store st ON st.store_id = stx.store_id
            """ + txn_where
            cursor.execute(txn_query, txn_params)
            txn_records = cursor.fetchall()
            if master_product_id:
                records = txn_records
            else:
                records.extend(txn_records)

            if sale_staff:
                records = [r for r in records if r.get('SaleStaff') and sale_staff.lower() in r.get('SaleStaff', '').lower()]
            if buyer:
                records = [r for r in records if r.get('Buyer') and buyer.lower() in r.get('Buyer', '').lower()]

            # 依日期與ID倒序排列，允許 Date 為 None 或非標準格式
            records.sort(
                key=lambda x: (
                    _normalize_date_for_sort(x.get('Date')),
                    x.get('Inventory_ID') or 0,
                ),
                reverse=True,
            )
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
                    date = %s,
                    supplier = %s,
                    buyer = %s,
                    voucher = %s,
                    note = %s
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
                data.get('supplier', existing.get('supplier')),
                data.get('buyer', existing.get('buyer')),
                data.get('voucher', existing.get('voucher')),
                data.get('note', existing.get('note')),
                inventory_id,
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
                    stock_threshold, store_id,
                    supplier, buyer, voucher, note
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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

            supplier = data.get('supplier')
            buyer = data.get('buyer')
            voucher = data.get('voucher')
            note = data.get('note')

            values = (
                product_id, staff_id, date, quantity,
                stock_in, stock_out, stock_loan,
                stock_threshold, store_id,
                supplier, buyer, voucher, note
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
                    p.price AS ProductPrice,
                    p.purchase_price AS PurchasePrice
                FROM product p
                WHERE p.status = 'PUBLISHED'
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
