# \app\models\product_sell_model.py
import pymysql
from app.config import DB_CONFIG

def connect_to_db():
    """連接到數據庫"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

def get_all_product_sells(store_id=None):
    """獲取產品銷售紀錄，可選用 store_id 過濾"""
    conn = connect_to_db()
    with conn.cursor() as cursor:
        query = """
            SELECT
                ps.product_sell_id, ps.member_id, m.member_code AS member_code,
                m.name as member_name, ps.store_id,
                st.store_name as store_name, ps.product_id, p.name as product_name,
                ps.quantity, ps.unit_price, ps.discount_amount, ps.final_price,
                ps.payment_method, sf.name as staff_name, ps.sale_category, ps.date, ps.note
            FROM product_sell ps
            LEFT JOIN member m ON ps.member_id = m.member_id
            LEFT JOIN store st ON ps.store_id = st.store_id
            LEFT JOIN product p ON ps.product_id = p.product_id
            LEFT JOIN staff sf ON ps.staff_id = sf.staff_id
        """
        params = []
        if store_id is not None:
            query += " WHERE ps.store_id = %s"
            params.append(store_id)
        
        query += " ORDER BY ps.date DESC, ps.product_sell_id DESC"
        cursor.execute(query, tuple(params))
        result = cursor.fetchall()
    conn.close()
    return result

def get_product_sell_by_id(sell_id: int):
    """根據ID獲取產品銷售紀錄"""
    conn = connect_to_db()
    with conn.cursor() as cursor:
        # The query here is for a single record, so it doesn't need store_id filtering at this level.
        # The route handler is responsible for checking if the user has permission to view this record.
        query = """
            SELECT
                ps.*, m.member_code AS member_code, m.name AS member_name,
                st.store_name, p.name AS product_name, sf.name AS staff_name
            FROM product_sell ps
            LEFT JOIN member m ON ps.member_id = m.member_id
            LEFT JOIN store st ON ps.store_id = st.store_id
            LEFT JOIN product p ON ps.product_id = p.product_id
            LEFT JOIN staff sf ON ps.staff_id = sf.staff_id
            WHERE ps.product_sell_id = %s
        """
        cursor.execute(query, (sell_id,))
        result = cursor.fetchone()
    conn.close()
    return result

def insert_product_sell(data: dict):
    """新增產品銷售紀錄，可處理單品或產品組合"""
    # 若沒有提供 product_id 或 bundle_id，則不進行插入
    if not data.get('product_id') and not data.get('bundle_id'):
        print("Skipping product_sell insertion due to missing product_id and bundle_id.")
        return None

    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            if data.get('bundle_id'):
                bundle_id = data.get('bundle_id')
                bundle_qty = int(data.get('quantity', 1))
                cursor.execute(
                    "SELECT item_id, quantity FROM product_bundle_items WHERE bundle_id = %s AND item_type = 'Product'",
                    (bundle_id,)
                )
                bundle_items = cursor.fetchall()
                if not bundle_items:
                    print(f"No product items found for bundle_id {bundle_id}.")
                    return None

                item_totals = []
                total_price = 0
                for item in bundle_items:
                    cursor.execute("SELECT price FROM product WHERE product_id = %s", (item['item_id'],))
                    price_row = cursor.fetchone()
                    unit_price = price_row['price'] if price_row and price_row.get('price') is not None else 0
                    quantity = int(item.get('quantity', 0)) * bundle_qty
                    item_total = unit_price * quantity
                    item_totals.append((item, unit_price, quantity, item_total))
                    total_price += item_total

                discount_total = float(data.get('discount_amount', 0))
                insert_query = """
                    INSERT INTO product_sell (
                        member_id, staff_id, store_id, product_id, date, quantity,
                        unit_price, discount_amount, final_price, payment_method,
                        sale_category, note
                    ) VALUES (
                        %(member_id)s, %(staff_id)s, %(store_id)s, %(product_id)s, %(date)s, %(quantity)s,
                        %(unit_price)s, %(discount_amount)s, %(final_price)s, %(payment_method)s,
                        %(sale_category)s, %(note)s
                    )
                """

                for item, unit_price, quantity, item_total in item_totals:
                    discount_amount = (item_total / total_price) * discount_total if total_price > 0 else 0
                    final_price = item_total - discount_amount
                    item_data = {
                        "member_id": data.get('member_id'),
                        "staff_id": data.get('staff_id'),
                        "store_id": data.get('store_id'),
                        "product_id": item['item_id'],
                        "date": data.get('date'),
                        "quantity": quantity,
                        "unit_price": unit_price,
                        "discount_amount": discount_amount,
                        "final_price": final_price,
                        "payment_method": data.get('payment_method'),
                        "sale_category": data.get('sale_category'),
                        "note": f"{data.get('note', '')} [bundle:{bundle_id}]",
                    }
                    cursor.execute(insert_query, item_data)
                    update_inventory_quantity(item['item_id'], data['store_id'], -quantity, cursor)

                conn.commit()
                return conn.insert_id()

            else:
                query = """
                    INSERT INTO product_sell (
                        member_id, staff_id, store_id, product_id, date, quantity,
                        unit_price, discount_amount, final_price, payment_method,
                        sale_category, note
                    ) VALUES (
                        %(member_id)s, %(staff_id)s, %(store_id)s, %(product_id)s, %(date)s, %(quantity)s,
                        %(unit_price)s, %(discount_amount)s, %(final_price)s, %(payment_method)s,
                        %(sale_category)s, %(note)s
                    )
                """
                cursor.execute(query, data)
                quantity_change = -int(data['quantity'])
                update_inventory_quantity(data['product_id'], data['store_id'], quantity_change, cursor)
                conn.commit()
                return conn.insert_id()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def update_inventory_quantity(product_id: int, store_id: int, quantity_change: int, cursor: pymysql.cursors.DictCursor):
    """
    更新指定產品在指定店家的庫存數量。

    參數:
        product_id (int): 要更新庫存的產品 ID。
        store_id (int): 產品所在的店家 ID。
        quantity_change (int): 庫存的變動量。
                                 正數表示增加庫存 (例如，取消銷售或退貨)。
                                 負數表示減少庫存 (例如，產生銷售)。
        cursor (pymysql.cursors.DictCursor): 外部傳入的資料庫游標，用於事務控制。

    假設:
    - `inventory` 表中有 `product_id`, `store_id`, `quantity` 欄位。
    - `quantity` 欄位代表該產品在該店家的當前總庫存水平。
    - 我們將更新符合 `product_id` 和 `store_id` 的最新一條 `inventory` 記錄。
      (如果一個 product/store 組合只有一條庫存記錄，則 `ORDER BY ... LIMIT 1` 不是必需的，
       但如果有多條，則需要明確更新哪一條，或您的 inventory 表結構應確保唯一性)。

    注意: 
    如果您的 `inventory` 表是作為一個「庫存異動日誌」來設計的（記錄每一次的 stock_in/stock_out），
    那麼這個函數的邏輯應該是 INSERT 一條新的異動記錄，而不是 UPDATE 現有記錄的 quantity。
    目前的實現是基於「直接更新總庫存量」的假設。
    """
    if not all([isinstance(product_id, int), isinstance(store_id, int), isinstance(quantity_change, int)]):
        raise TypeError("product_id, store_id, and quantity_change must be integers.")
    if quantity_change == 0:
        print(f"Inventory quantity change is zero for product_id={product_id}, store_id={store_id}. No update performed.")
        return True # 數量未變，無需更新

    # 根據您的 inventory 表結構，這個 UPDATE 語句可能需要調整
    # 特別是 WHERE 子句如何精確定位到要更新的庫存記錄。
    #
    # 之前的實作僅使用 product_id 與 store_id 作為條件，
    # 導致若同一產品在同一店家有多筆庫存記錄，所有紀錄都會被同時更新，
    # 造成一次銷售扣除多次庫存的錯誤。
    #
    # 為了確保只調整最新的一筆庫存紀錄，加入 `ORDER BY inventory_id DESC LIMIT 1`，
    # 只更新庫存表中最新的那一筆資料。
    update_query = """
        UPDATE inventory
        SET quantity = quantity + (%s)
        WHERE product_id = %s AND store_id = %s
        ORDER BY inventory_id DESC
        LIMIT 1
    """
    
    try:
        print(f"Attempting to update inventory: product_id={product_id}, store_id={store_id}, change={quantity_change}")
        
        # 先檢查庫存記錄是否存在，以及更新後的庫存是否會變為負數 (如果您的業務邏輯不允許負庫存)
        # select_query = "SELECT quantity FROM inventory WHERE product_id = %s AND store_id = %s ORDER BY inventory_id DESC LIMIT 1"
        # cursor.execute(select_query, (product_id, store_id))
        # current_inventory = cursor.fetchone()
        # if current_inventory and (current_inventory['quantity'] + quantity_change < 0):
        #     raise ValueError(f"Insufficient stock for product_id {product_id} at store_id {store_id}.")

        affected_rows = cursor.execute(update_query, (quantity_change, product_id, store_id))
        
        if affected_rows == 0:
            # 如果沒有找到記錄來更新，這是一個問題。
            # 可能表示該產品在該店家還沒有庫存記錄，或者 product_id/store_id 不正確。
            # 根據您的業務邏輯，這裡可能需要：
            # 1. 拋出錯誤 (如下面的例子)
            # 2. 創建一個新的庫存記錄 (如果允許的話)
            # 3. 靜默失敗或記錄警告
            print(f"Warning: No inventory record found to update for product_id={product_id}, store_id={store_id} when applying change {quantity_change}. Inventory might be unmanaged for this combination or IDs are incorrect.")
            # raise ValueError(f"No inventory record to update for product_id {product_id} at store_id {store_id}")
        
        print(f"Inventory update for product_id={product_id}, store_id={store_id}: {affected_rows} row(s) affected by quantity change of {quantity_change}.")
        return affected_rows > 0 # 或者可以返回 True/False 表示是否成功
        
    except Exception as e:
        print(f"Error in update_inventory_quantity for product_id={product_id}, store_id={store_id}: {e}")
        # 確保錯誤被重新拋出，以便調用它的函數 (如 insert_product_sell) 中的事務可以回滾
        raise

def update_product_sell(sell_id: int, data: dict):
    """更新產品銷售紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 1. 獲取原始銷售記錄
            cursor.execute("SELECT product_id, quantity, store_id FROM product_sell WHERE product_sell_id = %s", (sell_id,))
            original_sell = cursor.fetchone()
            if not original_sell:
                raise ValueError(f"找不到銷售記錄 ID: {sell_id}")

            # 2. 計算庫存變動
            original_product_id = original_sell['product_id']
            original_quantity = original_sell['quantity']
            original_store_id = original_sell['store_id']

            new_product_id = int(data.get("product_id", original_product_id))
            new_quantity = int(data.get("quantity", original_quantity))
            new_store_id = int(data.get("store_id", original_store_id))

            # 3. 更新銷售紀錄本身
            fields = [f"{key} = %s" for key in data.keys()]
            query = f"UPDATE product_sell SET {', '.join(fields)} WHERE product_sell_id = %s"
            params = list(data.values()) + [sell_id]
            cursor.execute(query, tuple(params))

            # 4. 調整庫存
            if (new_product_id != original_product_id or 
                new_quantity != original_quantity or 
                new_store_id != original_store_id):
                # a. 將原數量加回原庫存
                update_inventory_quantity(original_product_id, original_store_id, original_quantity, cursor)
                # b. 從新庫存中扣除新數量
                update_inventory_quantity(new_product_id, new_store_id, -new_quantity, cursor)
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
def delete_product_sell(sell_id):
    """刪除產品銷售紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 獲取要刪除的記錄以還原庫存
            cursor.execute(
                "SELECT inventory_id FROM product_sell WHERE product_sell_id = %s",
                (sell_id,)
            )
            sell = cursor.fetchone()
            
            if not sell:
                raise ValueError("找不到指定的銷售記錄")
            
            query = "DELETE FROM product_sell WHERE product_sell_id = %s"
            cursor.execute(query, (sell_id,))
            
            # 恢復庫存數量
            update_inventory_quantity(sell["inventory_id"], 1)
            
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def update_inventory_after_sale(product_id: int, store_id: int, quantity_change: int, cursor: pymysql.cursors.DictCursor):
    update_query = """
        UPDATE inventory 
        SET quantity = quantity + (%s) 
        WHERE product_id = %s AND store_id = %s
        ORDER BY inventory_id DESC LIMIT 1 
    """
    try:
        print(f"Attempting to update inventory: product_id={product_id}, store_id={store_id}, change={quantity_change}")
        affected_rows = cursor.execute(update_query, (quantity_change, product_id, store_id))
        if affected_rows == 0:
            # 如果沒有找到對應的庫存記錄來更新，這裡的處理方式很重要。
            # 1. 可能是該產品在該店家還沒有庫存記錄 -> 是否應該自動創建一個？
            # 2. 或者是 product_id 或 store_id 不正確。
            # 3. 如果 inventory 表是交易日誌，那麼這裡應該是 INSERT 新記錄，而不是 UPDATE。
            print(f"Warning: No inventory record found to update for product_id={product_id}, store_id={store_id}. Stock might be unmanaged or new for this combination.")
            # 根據您的業務邏輯，這裡可能需要拋出錯誤，或者創建新的庫存條目。
            # 例如: raise ValueError(f"No inventory record for product {product_id} at store {store_id}")
        print(f"Inventory update for product_id={product_id}, store_id={store_id}: {affected_rows} row(s) affected.")
    except Exception as e:
        print(f"Error in update_inventory_after_sale for product_id={product_id}, store_id={store_id}: {e}")
        raise # 將錯誤重新拋出，以便外層事務可以 rollback

def update_product_sell(sell_id: int, data: dict):
    """更新產品銷售紀錄 - 已更新以符合新表結構和庫存邏輯"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 1. 獲取原始銷售記錄的 product_id, quantity, store_id, staff_id
            cursor.execute(
                "SELECT product_id, quantity, store_id, staff_id FROM product_sell WHERE product_sell_id = %s",
                (sell_id,)
            )
            original_sell = cursor.fetchone()
            if not original_sell:
                raise ValueError(f"找不到指定的銷售記錄 ID: {sell_id}")

            original_product_id = original_sell['product_id']
            original_quantity = original_sell['quantity']
            original_store_id = original_sell['store_id'] # 假設 store_id 通常不變，如果變更則庫存調整更複雜
            # original_staff_id = original_sell['staff_id'] # 如果需要比較

            # 準備更新的欄位列表和對應的值
            fields_to_update = []
            values_to_update = []

            # 根據 data 字典動態構建 SET 子句
            # 確保 data 中的 key 與資料庫欄位名一致
            # 這些是 product_sell 表中允許更新的欄位
            allowed_fields = [
                "member_id", "staff_id", "store_id", "product_id", "date", 
                "quantity", "unit_price", "discount_amount", "final_price", 
                "payment_method", "sale_category", "note"
            ]

            for field in allowed_fields:
                if field in data: # 只有當 data 中提供了該欄位時才更新
                    fields_to_update.append(f"{field} = %s")
                    values_to_update.append(data.get(field))
            
            if not fields_to_update:
                conn.close()
                return True # 沒有需要更新的欄位

            query = f"""
                UPDATE product_sell
                SET {', '.join(fields_to_update)}
                WHERE product_sell_id = %s
            """
            values_to_update.append(sell_id)
            
            cursor.execute(query, tuple(values_to_update))

            # 2. 處理庫存調整
            new_product_id = int(data.get("product_id", original_product_id))
            new_quantity = int(data.get("quantity", original_quantity))
            new_store_id = int(data.get("store_id", original_store_id)) # 假設 store_id 也可能變更

            inventory_adjusted = False
            if new_product_id != original_product_id or new_quantity != original_quantity or new_store_id != original_store_id:
                # 產品、數量或店家有變更，需要調整庫存
                # a. 將原銷售的產品數量加回原店家庫存
                update_inventory_quantity(original_product_id, original_store_id, original_quantity, cursor) # 加回正數
                print(f"庫存調整：原產品 {original_product_id} 在店家 {original_store_id} 加回數量 {original_quantity}")
                
                # b. 將新銷售的產品數量從新店家庫存中扣除
                update_inventory_quantity(new_product_id, new_store_id, -new_quantity, cursor) # 扣除負數
                print(f"庫存調整：新產品 {new_product_id} 在店家 {new_store_id} 扣除數量 {new_quantity}")
                inventory_adjusted = True
            
            conn.commit()
            print(f"銷售記錄 {sell_id} 更新成功。庫存是否調整: {inventory_adjusted}")
            return True
    except Exception as e:
        conn.rollback()
        print(f"Error in update_product_sell for ID {sell_id}: {e}")
        raise e
    finally:
        if conn:
            conn.close()

def delete_product_sell(sell_id: int):
    """刪除產品銷售紀錄 - 已更新庫存邏輯"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 1. 獲取要刪除的記錄的 product_id, quantity, store_id 以便還原庫存
            cursor.execute(
                "SELECT product_id, quantity, store_id FROM product_sell WHERE product_sell_id = %s",
                (sell_id,)
            )
            sell_to_delete = cursor.fetchone()
            
            if not sell_to_delete:
                raise ValueError(f"找不到指定的銷售記錄 ID: {sell_id}")
            
            product_id_to_restore = sell_to_delete['product_id']
            quantity_to_restore = sell_to_delete['quantity']
            store_id_to_restore = sell_to_delete['store_id']

            # 2. 刪除銷售記錄
            query = "DELETE FROM product_sell WHERE product_sell_id = %s"
            affected_rows = cursor.execute(query, (sell_id,))
            
            if affected_rows == 0:
                 # 雖然上面已經檢查過，但多一層防護
                raise ValueError(f"嘗試刪除銷售記錄 ID: {sell_id} 失敗，記錄可能已被刪除。")

            # 3. 恢復庫存數量
            update_inventory_quantity(product_id_to_restore, store_id_to_restore, quantity_to_restore, cursor) # 加回正數
            print(f"庫存調整：產品 {product_id_to_restore} 在店家 {store_id_to_restore} 加回數量 {quantity_to_restore} (因銷售記錄 {sell_id} 刪除)")
            
            conn.commit()
            print(f"銷售記錄 {sell_id} 刪除成功。")
            return True
    except Exception as e:
        conn.rollback()
        print(f"Error in delete_product_sell for ID {sell_id}: {e}")
        raise e
    finally:
        if conn:
            conn.close()

def get_all_products_with_inventory(store_id=None):
    """
    獲取所有產品及其匯總後的庫存數量。
    - 使用 SUM() 和 GROUP BY 確保每個產品只返回一筆紀錄，包含其總庫存。
    - 如果提供了 store_id，則只計算該店家的庫存。
    - 如果 store_id 為 None (總店視角)，則計算所有店家的庫存總和。
    """
    conn = connect_to_db()
    with conn.cursor() as cursor:
        # 基礎查詢：左連接 inventory 以取得庫存數量
        base_query = """
            SELECT
                p.product_id,
                p.code AS product_code,
                p.name AS product_name,
                p.price AS product_price,
                COALESCE(SUM(i.quantity), 0) AS inventory_quantity,
                0 AS inventory_id
            FROM product p
            LEFT JOIN inventory i ON p.product_id = i.product_id {store_join}
            GROUP BY p.product_id, p.code, p.name, p.price
            ORDER BY p.name
        """

        params = []
        store_join = ""
        # 若指定 store_id，僅統計該店家的庫存，且保留沒有庫存紀錄的產品
        if store_id is not None:
            store_join = "AND i.store_id = %s"
            params.append(store_id)

        query = base_query.format(store_join=store_join)

        cursor.execute(query, tuple(params))
        result = cursor.fetchall()
    conn.close()
    return result

def search_products_with_inventory(keyword, store_id=None):
    """
    根據關鍵字搜尋產品及其匯總後的庫存信息。
    邏輯同上，但增加了關鍵字和 store_id 的過濾。
    """
    conn = connect_to_db()
    with conn.cursor() as cursor:
        like_keyword = f"%{keyword}%"
        
        base_query = """
            SELECT
                p.product_id,
                p.code AS product_code,
                p.name AS product_name,
                p.price AS product_price,
                COALESCE(SUM(i.quantity), 0) AS inventory_quantity,
                0 AS inventory_id
            FROM product p
            LEFT JOIN inventory i ON p.product_id = i.product_id {store_join}
        """

        params = []
        conditions = []
        store_join = ""

        if store_id is not None:
            store_join = "AND i.store_id = %s"
            params.append(store_id)

        if keyword:
            conditions.append("(p.name LIKE %s OR p.code LIKE %s)")
            params.extend([like_keyword, like_keyword])

        query = base_query.format(store_join=store_join)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " GROUP BY p.product_id, p.code, p.name, p.price ORDER BY p.name"

        cursor.execute(query, tuple(params))
        result = cursor.fetchall()
    conn.close()
    return result

def export_product_sells(store_id=None):
    """匯出產品銷售記錄，可選用 store_id 過濾"""
    # 此函數的 SQL 邏輯與 get_all_product_sells 相似
    conn = connect_to_db()
    with conn.cursor() as cursor:
        query = """
            SELECT
                ps.product_sell_id, ps.member_id, m.member_code AS member_code,
                m.name as member_name, ps.store_id,
                st.store_name, ps.product_id, p.name as product_name, ps.quantity,
                ps.unit_price, ps.discount_amount, ps.final_price, ps.payment_method,
                sf.name as staff_name, ps.sale_category, DATE_FORMAT(ps.date, '%%Y-%%m-%%d') as date, ps.note
            FROM product_sell ps
            LEFT JOIN member m ON ps.member_id = m.member_id
            LEFT JOIN store st ON ps.store_id = st.store_id
            LEFT JOIN product p ON ps.product_id = p.product_id
            LEFT JOIN staff sf ON ps.staff_id = sf.staff_id
        """
        params = []
        if store_id is not None:
            query += " WHERE ps.store_id = %s"
            params.append(store_id)
        
        query += " ORDER BY ps.date DESC, ps.product_sell_id DESC"
        cursor.execute(query, tuple(params))
        result = cursor.fetchall()
    conn.close()
    return result

def search_product_sells(keyword, store_id=None):
    """搜尋產品銷售紀錄，可選用 store_id 過濾"""
    conn = connect_to_db()
    with conn.cursor() as cursor:
        like_keyword = f"%{keyword}%"
        query = """
            SELECT
                ps.product_sell_id, ps.member_id, m.member_code AS member_code,
                m.name as member_name, ps.store_id,
                st.store_name, ps.product_id, p.name as product_name, ps.quantity,
                ps.unit_price, ps.discount_amount, ps.final_price, ps.payment_method,
                sf.name as staff_name, ps.sale_category, DATE_FORMAT(ps.date, '%%Y-%%m-%%d') as date, ps.note
            FROM product_sell ps
            LEFT JOIN member m ON ps.member_id = m.member_id
            LEFT JOIN store st ON ps.store_id = st.store_id
            LEFT JOIN product p ON ps.product_id = p.product_id
            LEFT JOIN staff sf ON ps.staff_id = sf.staff_id
        """
        
        conditions = []
        params = []

        if keyword:
            keyword_conditions = [
                "m.name LIKE %s",
                "m.member_code LIKE %s",
                "p.name LIKE %s",
                "ps.note LIKE %s"
            ]
            conditions.append(f"({' OR '.join(keyword_conditions)})")
            params.extend([like_keyword] * len(keyword_conditions))

        if store_id is not None:
            conditions.append("ps.store_id = %s")
            params.append(store_id)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY ps.date DESC, ps.product_sell_id DESC"
        
        cursor.execute(query, tuple(params))
        result = cursor.fetchall()
    conn.close()
    return result