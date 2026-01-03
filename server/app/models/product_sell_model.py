# \app\models\product_sell_model.py
import pymysql
import json
from decimal import Decimal
from uuid import uuid4
from functools import lru_cache
from app.config import DB_CONFIG

def connect_to_db():
    """連接到數據庫"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)


def _normalize_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


@lru_cache(maxsize=1)
def _master_stock_supports_store_level() -> bool:
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT 1
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'master_stock'
                  AND COLUMN_NAME = 'store_id'
                LIMIT 1
                """
            )
            return cursor.fetchone() is not None
    except Exception:
        return False
    finally:
        conn.close()


def _get_master_product_id_for_variant(cursor, variant_id: int | None):
    if variant_id is None:
        return None
    cursor.execute(
        "SELECT master_product_id FROM product_variant WHERE variant_id = %s",
        (variant_id,),
    )
    row = cursor.fetchone()
    return row["master_product_id"] if row else None


def _get_inventory_item_id_for_variant(cursor, variant_id: int | None):
    if variant_id is None:
        return None
    cursor.execute(
        """
        SELECT p.inventory_item_id
        FROM product_variant pv
        JOIN product p ON p.product_id = pv.variant_id
        WHERE pv.variant_id = %s
        """,
        (variant_id,),
    )
    row = cursor.fetchone()
    return row["inventory_item_id"] if row else None


def _adjust_master_stock_for_variant(
    cursor,
    variant_id: int | None,
    store_id: int | None,
    quantity_change: int,
    staff_id: int | None = None,
    reference_no: str | None = None,
    note: str | None = None,
):
    if not quantity_change or variant_id is None:
        return

    master_product_id = _get_master_product_id_for_variant(cursor, variant_id)
    inventory_item_id = _get_inventory_item_id_for_variant(cursor, variant_id)
    if inventory_item_id is None:
        return

    store_scoped = _master_stock_supports_store_level()
    store_value = _normalize_int(store_id)
    if store_scoped and store_value is None:
        raise ValueError("store_id is required when master_stock is store-level")

    if store_scoped:
        select_query = (
            "SELECT quantity_on_hand FROM master_stock WHERE inventory_item_id = %s AND store_id = %s FOR UPDATE"
        )
        select_params = (inventory_item_id, store_value)
    else:
        select_query = "SELECT quantity_on_hand FROM master_stock WHERE inventory_item_id = %s FOR UPDATE"
        select_params = (inventory_item_id,)

    cursor.execute(select_query, select_params)
    row = cursor.fetchone()
    if row is None:
        if store_scoped:
            cursor.execute(
                "INSERT INTO master_stock (inventory_item_id, master_product_id, store_id, quantity_on_hand) VALUES (%s, %s, %s, 0)"
                " ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand",
                (inventory_item_id, master_product_id, store_value),
            )
        else:
            cursor.execute(
                "INSERT INTO master_stock (inventory_item_id, master_product_id, quantity_on_hand) VALUES (%s, %s, 0)"
                " ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand",
                (inventory_item_id, master_product_id),
            )
        cursor.execute(select_query, select_params)
        row = cursor.fetchone()

    current_qty = row["quantity_on_hand"] if row else 0
    new_qty = current_qty + quantity_change
    if new_qty < 0:
        raise ValueError(f"庫存不足，無法扣除 {abs(quantity_change)}，目前僅剩 {current_qty}")

    if store_scoped:
        update_query = (
            "UPDATE master_stock SET quantity_on_hand = quantity_on_hand + %s, master_product_id = %s, updated_at = NOW()"
            " WHERE inventory_item_id = %s AND store_id = %s"
        )
        update_params = (quantity_change, master_product_id, inventory_item_id, store_value)
    else:
        update_query = (
            "UPDATE master_stock SET quantity_on_hand = quantity_on_hand + %s, master_product_id = %s, updated_at = NOW()"
            " WHERE inventory_item_id = %s"
        )
        update_params = (quantity_change, master_product_id, inventory_item_id)
    cursor.execute(update_query, update_params)

    txn_type = "ADJUST"
    if quantity_change > 0:
        txn_type = "INBOUND"
    elif quantity_change < 0:
        txn_type = "OUTBOUND"

    cursor.execute(
        """
        INSERT INTO stock_transaction (master_product_id, inventory_item_id, variant_id, store_id, staff_id, txn_type, quantity, reference_no, note)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            master_product_id,
            inventory_item_id,
            variant_id,
            store_value if store_scoped else None,
            staff_id,
            txn_type,
            quantity_change,
            reference_no,
            note,
        ),
    )


def _product_code_prefix_expr(column_name: str) -> str:
    """Build a SQL expression that extracts the alphanumeric prefix of a product code."""
    return f"UPPER(COALESCE(REGEXP_SUBSTR({column_name}, '^[A-Za-z]+[0-9]*'), {column_name}))"


def _build_master_stock_join_clause(store_id):
    code_prefix = _product_code_prefix_expr("p.code")
    store_scoped = _master_stock_supports_store_level()
    store_id_value = _normalize_int(store_id)
    params: list[int] = []
    where_clause = ""
    if store_scoped and store_id_value is not None:
        where_clause = "WHERE ms.store_id = %s"
        params.append(store_id_value)

    join_clause = f"""
        LEFT JOIN (
            SELECT {_product_code_prefix_expr("p2.code")} AS code_prefix,
                   SUM(ms.quantity_on_hand) AS quantity_on_hand
            FROM product_variant pv
            JOIN product p2 ON p2.product_id = pv.variant_id
            JOIN master_stock ms ON ms.inventory_item_id = p2.inventory_item_id
            {where_clause}
            GROUP BY code_prefix
        ) ms_inventory ON ms_inventory.code_prefix = {code_prefix}
    """
    return join_clause, params


def _build_inventory_prefix_join_clause(store_id):
    code_prefix = _product_code_prefix_expr("p.code")
    params: list[int] = []
    where_clause = ""
    store_id_value = _normalize_int(store_id)
    if store_id_value is not None:
        where_clause = "WHERE i.store_id = %s"
        params.append(store_id_value)

    join_clause = f"""
        LEFT JOIN (
            SELECT {_product_code_prefix_expr("p2.code")} AS code_prefix,
                   SUM(i.quantity) AS quantity
            FROM product p2
            LEFT JOIN inventory i ON p2.product_id = i.product_id
            {where_clause}
            GROUP BY code_prefix
        ) inv_inventory ON inv_inventory.code_prefix = {code_prefix}
    """
    return join_clause, params

def get_all_product_sells(store_id=None):
    """獲取產品銷售紀錄，可選用 store_id 過濾"""
    conn = connect_to_db()
    with conn.cursor() as cursor:
        query = """
            SELECT
                ps.product_sell_id, ps.member_id, m.member_code AS member_code,
                m.name as member_name, ps.store_id,
                st.store_name as store_name, ps.product_id,
                COALESCE(p.name, ps.product_name) as product_name,
                ps.quantity, ps.unit_price, ps.discount_amount, ps.final_price,
                ps.payment_method, sf.name as staff_name, ps.sale_category, ps.date, ps.note,
                ps.order_reference
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
        
        query += (
            " ORDER BY"
            " (COALESCE(NULLIF(st.store_name, ''), CAST(ps.store_id AS CHAR)) = ''),"
            " COALESCE(NULLIF(st.store_name, ''), CAST(ps.store_id AS CHAR)),"
            " (COALESCE(NULLIF(m.member_code, ''), '') = ''),"
            " CHAR_LENGTH(COALESCE(NULLIF(m.member_code, ''), '')),"
            " COALESCE(NULLIF(m.member_code, ''), ''),"
            " ps.date DESC,"
            " ps.product_sell_id DESC"
        )
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
                st.store_name, p.code AS product_code,
                COALESCE(p.name, ps.product_name) AS product_name, sf.name AS staff_name
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

def get_product_sells_by_order_reference(order_reference: str):
    """根據訂單參考號取得同筆銷售的所有項目"""
    conn = connect_to_db()
    with conn.cursor() as cursor:
        query = """
            SELECT
                ps.*, m.member_code AS member_code, m.name AS member_name,
                st.store_name, p.code AS product_code,
                COALESCE(p.name, ps.product_name) AS product_name, sf.name AS staff_name
            FROM product_sell ps
            LEFT JOIN member m ON ps.member_id = m.member_id
            LEFT JOIN store st ON ps.store_id = st.store_id
            LEFT JOIN product p ON ps.product_id = p.product_id
            LEFT JOIN staff sf ON ps.staff_id = sf.staff_id
            WHERE ps.order_reference = %s
            ORDER BY ps.product_sell_id ASC
        """
        cursor.execute(query, (order_reference,))
        result = cursor.fetchall()
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
            insert_query = """
                INSERT INTO product_sell (
                    member_id, staff_id, store_id, product_id, product_name, date, quantity,
                    unit_price, discount_amount, final_price, payment_method,
                    sale_category, note, order_reference
                ) VALUES (
                    %(member_id)s, %(staff_id)s, %(store_id)s, %(product_id)s, %(product_name)s, %(date)s, %(quantity)s,
                    %(unit_price)s, %(discount_amount)s, %(final_price)s, %(payment_method)s,
                    %(sale_category)s, %(note)s, %(order_reference)s
                )
            """
            if data.get('bundle_id'):
                bundle_id = data.get('bundle_id')
                bundle_qty = int(data.get('quantity', 1))
                bundle_order_reference = data.get('order_reference') or f"bundle-{bundle_id}-{uuid4()}"
                cursor.execute(
                    "SELECT item_id, quantity FROM product_bundle_items WHERE bundle_id = %s AND item_type = 'Product'",
                    (bundle_id,),
                )
                bundle_items = cursor.fetchall()
                cursor.execute(
                    "SELECT name FROM product_bundles WHERE bundle_id = %s",
                    (bundle_id,),
                )
                bundle_row = cursor.fetchone() or {}
                bundle_name = bundle_row.get('name') or data.get('product_name')
                bundle_components = []
                if not bundle_items:
                    bundle_data = {
                        "member_id": data.get('member_id'),
                        "staff_id": data.get('staff_id'),
                        "store_id": data.get('store_id'),
                        "product_id": None,
                        "product_name": None,
                        "date": data.get('date'),
                        "quantity": bundle_qty,
                        "unit_price": float(data.get('unit_price', 0)),
                        "discount_amount": float(data.get('discount_amount', 0)),
                        "final_price": float(data.get('final_price', 0)),
                        "payment_method": data.get('payment_method'),
                        "sale_category": data.get('sale_category'),
                        "note": f"{data.get('note', '').strip()} [bundle:{bundle_id}]".strip(),
                        "order_reference": bundle_order_reference,
                    }
                    cursor.execute(insert_query, bundle_data)
                    conn.commit()
                    return conn.insert_id()

                item_totals = []
                total_price = Decimal('0')
                for item in bundle_items:
                    cursor.execute("SELECT name, price, status FROM product WHERE product_id = %s", (item['item_id'],))
                    price_row = cursor.fetchone()
                    if not price_row or price_row.get('status') != 'PUBLISHED':
                        raise ValueError("品項已下架")
                    unit_price = Decimal(str(price_row['price'])) if price_row.get('price') is not None else Decimal('0')
                    product_name = price_row.get('name')
                    per_bundle_qty = int(item.get('quantity', 0))
                    quantity = per_bundle_qty * bundle_qty
                    item_total = unit_price * quantity
                    item_totals.append((item, unit_price, product_name, quantity, per_bundle_qty, item_total))
                    total_price += item_total
                    bundle_components.append(f"{product_name} x{per_bundle_qty}")
                provided_final_price = Decimal(str(data.get('final_price') or 0))
                provided_unit_price = Decimal(str(data.get('unit_price') or 0))
                provided_discount = Decimal(str(data.get('discount_amount') or 0))

                if provided_final_price <= 0 and provided_unit_price > 0:
                    provided_final_price = provided_unit_price

                if total_price > 0:
                    if provided_final_price > 0:
                        target_total = provided_final_price
                        discount_total = total_price - target_total
                    else:
                        discount_total = provided_discount
                        target_total = total_price - discount_total
                        if target_total <= 0:
                            target_total = total_price
                            discount_total = Decimal('0')
                else:
                    target_total = provided_final_price if provided_final_price > 0 else Decimal('0')
                    discount_total = Decimal('0')

                bundle_note_parts = []
                base_note = (data.get('note') or '').strip()
                if base_note:
                    bundle_note_parts.append(base_note)
                if bundle_components:
                    bundle_note_parts.append(', '.join(bundle_components))
                bundle_note = ' '.join(part for part in bundle_note_parts if part).strip()

                bundle_metadata = {
                    "id": bundle_id,
                    "qty": bundle_qty,
                    "total": float(target_total) if target_total else 0,
                    "name": bundle_name,
                }
                bundle_metadata_tag = f"[[bundle_meta {json.dumps(bundle_metadata, ensure_ascii=False)}]]"
                bundle_note_with_tag = (
                    ' '.join(
                        part
                        for part in [bundle_note, bundle_metadata_tag, f"[bundle:{bundle_id}]"]
                        if part
                    ).strip()
                )

                distributed_rows = []
                if total_price > 0 and item_totals:
                    running_discount = Decimal('0')
                    running_final = Decimal('0')
                    for index, item_data in enumerate(item_totals):
                        item_total = item_data[5]
                        if index == len(item_totals) - 1:
                            discount_amount = (discount_total - running_discount).quantize(Decimal('0.01'))
                            final_price = (target_total - running_final).quantize(Decimal('0.01'))
                        else:
                            ratio = (item_total / total_price) if total_price > 0 else Decimal('0')
                            discount_amount = (discount_total * ratio).quantize(Decimal('0.01'))
                            final_price = (item_total - discount_amount).quantize(Decimal('0.01'))
                            running_discount += discount_amount
                            running_final += final_price
                        distributed_rows.append((discount_amount, final_price))
                    if len(distributed_rows) == len(item_totals):
                        discount_total = sum(row[0] for row in distributed_rows)
                elif item_totals:
                    per_item_total = (target_total / len(item_totals)) if item_totals else Decimal('0')
                    for _ in item_totals:
                        distributed_rows.append((Decimal('0'), per_item_total))

                for index, (item, unit_price, product_name, quantity, per_bundle_qty, item_total) in enumerate(item_totals):
                    if distributed_rows and index < len(distributed_rows):
                        discount_amount, final_price = distributed_rows[index]
                    else:
                        discount_amount = (item_total / total_price * discount_total) if total_price > 0 else Decimal('0')
                        final_price = item_total - discount_amount
                    item_data = {
                        "member_id": data.get('member_id'),
                        "staff_id": data.get('staff_id'),
                        "store_id": data.get('store_id'),
                        "product_id": item['item_id'],
                        "product_name": product_name,
                        "date": data.get('date'),
                        "quantity": quantity,
                        "unit_price": float(unit_price),
                        "discount_amount": float(discount_amount),
                        "final_price": float(final_price),
                        "payment_method": data.get('payment_method'),
                        "sale_category": data.get('sale_category'),
                        "note": bundle_note_with_tag,
                        "order_reference": bundle_order_reference,
                    }
                    cursor.execute(insert_query, item_data)
                    update_inventory_quantity(item['item_id'], data['store_id'], -quantity, cursor)
                    _adjust_master_stock_for_variant(
                        cursor,
                        item['item_id'],
                        data.get('store_id'),
                        -quantity,
                        data.get('staff_id'),
                        item_data.get('order_reference'),
                        item_data.get('note'),
                    )

                conn.commit()
                return conn.insert_id()
            else:
                cursor.execute("SELECT name, status FROM product WHERE product_id = %s", (data['product_id'],))
                name_row = cursor.fetchone()
                if not name_row or name_row.get('status') != 'PUBLISHED':
                    raise ValueError("品項已下架")
                data['product_name'] = name_row.get('name')
                data['order_reference'] = data.get('order_reference')
                cursor.execute(insert_query, data)
                quantity_change = -int(data['quantity'])
                update_inventory_quantity(data['product_id'], data['store_id'], quantity_change, cursor)
                _adjust_master_stock_for_variant(
                    cursor,
                    data['product_id'],
                    data.get('store_id'),
                    quantity_change,
                    data.get('staff_id'),
                    data.get('order_reference'),
                    data.get('note'),
                )
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
                "SELECT product_id, quantity, store_id, staff_id, order_reference FROM product_sell WHERE product_sell_id = %s",
                (sell_id,)
            )
            original_sell = cursor.fetchone()
            if not original_sell:
                raise ValueError(f"找不到指定的銷售記錄 ID: {sell_id}")

            original_product_id = original_sell['product_id']
            original_quantity = original_sell['quantity']
            original_store_id = original_sell['store_id'] # 假設 store_id 通常不變，如果變更則庫存調整更複雜
            original_staff_id = original_sell.get('staff_id')
            original_order_reference = original_sell.get('order_reference')

            # 準備更新的欄位列表和對應的值
            fields_to_update = []
            values_to_update = []

            # 根據 data 字典動態構建 SET 子句
            # 確保 data 中的 key 與資料庫欄位名一致
            # 這些是 product_sell 表中允許更新的欄位
            allowed_fields = [
                "member_id", "staff_id", "store_id", "product_id", "date", 
                "quantity", "unit_price", "discount_amount", "final_price", 
                "payment_method", "sale_category", "note", "order_reference"
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
            new_staff_id = _normalize_int(data.get("staff_id", original_staff_id))
            new_order_reference = data.get("order_reference", original_order_reference)
            cursor.execute("SELECT status FROM product WHERE product_id = %s", (new_product_id,))
            status_row = cursor.fetchone()
            if not status_row or status_row.get('status') != 'PUBLISHED':
                raise ValueError("品項已下架")

            inventory_adjusted = False
            if new_product_id != original_product_id or new_quantity != original_quantity or new_store_id != original_store_id:
                # 產品、數量或店家有變更，需要調整庫存
                # a. 將原銷售的產品數量加回原店家庫存
                update_inventory_quantity(original_product_id, original_store_id, original_quantity, cursor) # 加回正數
                print(f"庫存調整：原產品 {original_product_id} 在店家 {original_store_id} 加回數量 {original_quantity}")
                
                # b. 將新銷售的產品數量從新店家庫存中扣除
                update_inventory_quantity(new_product_id, new_store_id, -new_quantity, cursor) # 扣除負數
                print(f"庫存調整：新產品 {new_product_id} 在店家 {new_store_id} 扣除數量 {new_quantity}")
                _adjust_master_stock_for_variant(
                    cursor,
                    original_product_id,
                    original_store_id,
                    original_quantity,
                    original_staff_id,
                    original_order_reference,
                    data.get('note'),
                )
                _adjust_master_stock_for_variant(
                    cursor,
                    new_product_id,
                    new_store_id,
                    -new_quantity,
                    new_staff_id,
                    new_order_reference,
                    data.get('note'),
                )
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
                "SELECT product_id, quantity, store_id, staff_id, order_reference FROM product_sell WHERE product_sell_id = %s",
                (sell_id,)
            )
            sell_to_delete = cursor.fetchone()
            
            if not sell_to_delete:
                raise ValueError(f"找不到指定的銷售記錄 ID: {sell_id}")
            
            product_id_to_restore = sell_to_delete['product_id']
            quantity_to_restore = sell_to_delete['quantity']
            store_id_to_restore = sell_to_delete['store_id']
            staff_id_to_log = sell_to_delete.get('staff_id')
            order_reference = sell_to_delete.get('order_reference')

            # 2. 刪除銷售記錄
            query = "DELETE FROM product_sell WHERE product_sell_id = %s"
            affected_rows = cursor.execute(query, (sell_id,))
            
            if affected_rows == 0:
                 # 雖然上面已經檢查過，但多一層防護
                raise ValueError(f"嘗試刪除銷售記錄 ID: {sell_id} 失敗，記錄可能已被刪除。")

            # 3. 恢復庫存數量
            update_inventory_quantity(product_id_to_restore, store_id_to_restore, quantity_to_restore, cursor) # 加回正數
            _adjust_master_stock_for_variant(
                cursor,
                product_id_to_restore,
                store_id_to_restore,
                quantity_to_restore,
                staff_id_to_log,
                order_reference,
                None,
            )
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

def _permission_is_allowed(allowed_permissions, user_permission):
    if user_permission is None or not allowed_permissions:
        return True
    if isinstance(allowed_permissions, list):
        return user_permission in allowed_permissions
    return user_permission == allowed_permissions


def get_all_products_with_inventory(store_id=None, status: str | None = 'PUBLISHED', user_permission: str | None = None):
    """
    獲取所有產品及其匯總後的庫存數量。
    - 使用 SUM() 和 GROUP BY 確保每個產品只返回一筆紀錄，包含其總庫存。
    - 如果提供了 store_id，則只計算該店家的庫存。
    - 如果 store_id 為 None (總店視角)，則計算所有店家的庫存總和。
    """
    conn = connect_to_db()
    with conn.cursor() as cursor:
        # 基礎查詢：依產品編號 PREFIX 匯總 master_stock 與 inventory
        base_query = """
            SELECT
                p.product_id,
                p.code AS product_code,
                p.name AS product_name,
                p.price AS product_price,
                p.purchase_price AS purchase_price,
                p.visible_store_ids,
                p.visible_permissions,
                CASE
                    WHEN MAX(ms_inventory.quantity_on_hand) IS NOT NULL THEN MAX(ms_inventory.quantity_on_hand)
                    ELSE COALESCE(MAX(inv_inventory.quantity), 0)
                END AS inventory_quantity,
                0 AS inventory_id,
                GROUP_CONCAT(c.name) AS categories,
                COALESCE(
                    JSON_OBJECTAGG(
                        COALESCE(
                            NULLIF(ppt.identity_type, ''),
                            CASE
                                WHEN ppt.price_tier_id IS NOT NULL THEN CONCAT('UNKNOWN_', ppt.price_tier_id)
                                ELSE CONCAT('UNKNOWN_PRODUCT_', CAST(p.product_id AS CHAR))
                            END
                        ),
                        ppt.price
                    ),
                    '{}'
                ) AS price_tiers
            FROM product p
            LEFT JOIN product_category pc ON p.product_id = pc.product_id
            LEFT JOIN category c ON pc.category_id = c.category_id
            {inventory_join}
            {master_join}
            LEFT JOIN product_price_tier ppt ON ppt.product_id = p.product_id AND ppt.identity_type IS NOT NULL
        """

        params: list = []

        inventory_join_clause, inventory_params = _build_inventory_prefix_join_clause(store_id)
        master_join_clause, master_params = _build_master_stock_join_clause(store_id)

        query = (
            base_query.replace("{inventory_join}", inventory_join_clause)
            .replace("{master_join}", master_join_clause)
        )
        params.extend(inventory_params)
        params.extend(master_params)
        if status:
            query += " WHERE p.status = %s"
            params.append(status)
        query += " GROUP BY p.product_id, p.code, p.name, p.price, p.purchase_price, p.visible_store_ids, p.visible_permissions ORDER BY p.name"
        cursor.execute(query, tuple(params))
    result = cursor.fetchall()
    conn.close()
    filtered = []
    for row in result:
        store_ids = None
        permissions = None
        if row.get('visible_store_ids'):
            try:
                store_ids = json.loads(row['visible_store_ids'])
                if isinstance(store_ids, (int, str)):
                    store_ids = [int(store_ids)]
            except Exception:
                store_ids = None
        if row.get('visible_permissions'):
            try:
                permissions = json.loads(row['visible_permissions'])
                if isinstance(permissions, str):
                    permissions = [permissions]
            except Exception:
                permissions = None
        if (store_id is None or not store_ids or int(store_id) in store_ids) and _permission_is_allowed(permissions, user_permission):
            if store_ids is not None:
                row['visible_store_ids'] = store_ids
            if permissions is not None:
                row['visible_permissions'] = permissions
            if row.get('categories'):
                row['categories'] = row['categories'].split(',')
            if row.get('price_tiers'):
                try:
                    row['price_tiers'] = json.loads(row['price_tiers'])
                except Exception:
                    row['price_tiers'] = None
            if row.get('price_tiers') is None:
                row['price_tiers'] = {}
        filtered.append(row)
    return filtered

def search_products_with_inventory(keyword, store_id=None, status: str | None = 'PUBLISHED', user_permission: str | None = None):
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
                p.purchase_price AS purchase_price,
                p.visible_store_ids,
                p.visible_permissions,
                CASE
                    WHEN MAX(ms_inventory.quantity_on_hand) IS NOT NULL THEN MAX(ms_inventory.quantity_on_hand)
                    ELSE COALESCE(MAX(inv_inventory.quantity), 0)
                END AS inventory_quantity,
                0 AS inventory_id,
                GROUP_CONCAT(c.name) AS categories,
                COALESCE(
                    JSON_OBJECTAGG(
                        COALESCE(
                            NULLIF(ppt.identity_type, ''),
                            CASE
                                WHEN ppt.price_tier_id IS NOT NULL THEN CONCAT('UNKNOWN_', ppt.price_tier_id)
                                ELSE CONCAT('UNKNOWN_PRODUCT_', CAST(p.product_id AS CHAR))
                            END
                        ),
                        ppt.price
                    ),
                    '{}'
                ) AS price_tiers
            FROM product p
            LEFT JOIN product_category pc ON p.product_id = pc.product_id
            LEFT JOIN category c ON pc.category_id = c.category_id
            {inventory_join}
            {master_join}
            LEFT JOIN product_price_tier ppt ON ppt.product_id = p.product_id AND ppt.identity_type IS NOT NULL
        """

        params = []
        conditions = []

        inventory_join_clause, inventory_params = _build_inventory_prefix_join_clause(store_id)
        master_join_clause, master_params = _build_master_stock_join_clause(store_id)
        params.extend(inventory_params)
        params.extend(master_params)

        if keyword:
            conditions.append("(p.name LIKE %s OR p.code LIKE %s)")
            params.extend([like_keyword, like_keyword])
        if status:
            conditions.append("p.status = %s")
            params.append(status)

        query = (
            base_query.replace("{inventory_join}", inventory_join_clause)
            .replace("{master_join}", master_join_clause)
        )

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " GROUP BY p.product_id, p.code, p.name, p.price, p.purchase_price, p.visible_store_ids, p.visible_permissions ORDER BY p.name"

        cursor.execute(query, tuple(params))
        result = cursor.fetchall()
    conn.close()
    filtered = []
    for row in result:
        store_ids = None
        permissions = None
        if row.get('visible_store_ids'):
            try:
                store_ids = json.loads(row['visible_store_ids'])
                if isinstance(store_ids, (int, str)):
                    store_ids = [int(store_ids)]
            except Exception:
                store_ids = None
        if row.get('visible_permissions'):
            try:
                permissions = json.loads(row['visible_permissions'])
                if isinstance(permissions, str):
                    permissions = [permissions]
            except Exception:
                permissions = None
        if (store_id is None or not store_ids or int(store_id) in store_ids) and _permission_is_allowed(permissions, user_permission):
            if store_ids is not None:
                row['visible_store_ids'] = store_ids
            if permissions is not None:
                row['visible_permissions'] = permissions
            if row.get('categories'):
                row['categories'] = row['categories'].split(',')
            if row.get('price_tiers'):
                try:
                    row['price_tiers'] = json.loads(row['price_tiers'])
                except Exception:
                    row['price_tiers'] = None
            if row.get('price_tiers') is None:
                row['price_tiers'] = {}
        filtered.append(row)
    return filtered

def export_product_sells(store_id=None):
    """匯出產品銷售記錄，可選用 store_id 過濾"""
    # 此函數的 SQL 邏輯與 get_all_product_sells 相似
    conn = connect_to_db()
    with conn.cursor() as cursor:
        query = """
            SELECT
                ps.product_sell_id, ps.member_id, m.member_code AS member_code,
                m.name as member_name, ps.store_id,
                st.store_name, ps.product_id, COALESCE(p.name, ps.product_name) as product_name, ps.quantity,
                ps.unit_price, ps.discount_amount, ps.final_price, ps.payment_method,
                sf.name as staff_name, ps.sale_category, DATE_FORMAT(ps.date, '%%Y-%%m-%%d') as date, ps.note,
                ps.order_reference
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
        
        query += (
            " ORDER BY"
            " (COALESCE(NULLIF(st.store_name, ''), CAST(ps.store_id AS CHAR)) = ''),"
            " COALESCE(NULLIF(st.store_name, ''), CAST(ps.store_id AS CHAR)),"
            " (COALESCE(NULLIF(m.member_code, ''), '') = ''),"
            " CHAR_LENGTH(COALESCE(NULLIF(m.member_code, ''), '')),"
            " COALESCE(NULLIF(m.member_code, ''), ''),"
            " ps.date DESC,"
            " ps.product_sell_id DESC"
        )
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
                st.store_name, ps.product_id, COALESCE(p.name, ps.product_name) as product_name, ps.quantity,
                ps.unit_price, ps.discount_amount, ps.final_price, ps.payment_method,
                sf.name as staff_name, ps.sale_category, DATE_FORMAT(ps.date, '%%Y-%%m-%%d') as date, ps.note,
                ps.order_reference
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

        query += (
            " ORDER BY"
            " (COALESCE(NULLIF(st.store_name, ''), CAST(ps.store_id AS CHAR)) = ''),"
            " COALESCE(NULLIF(st.store_name, ''), CAST(ps.store_id AS CHAR)),"
            " (COALESCE(NULLIF(m.member_code, ''), '') = ''),"
            " CHAR_LENGTH(COALESCE(NULLIF(m.member_code, ''), '')),"
            " COALESCE(NULLIF(m.member_code, ''), ''),"
            " ps.date DESC,"
            " ps.product_sell_id DESC"
        )
        
        cursor.execute(query, tuple(params))
        result = cursor.fetchall()
    conn.close()
    return result
