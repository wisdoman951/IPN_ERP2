import pymysql
from app.config import DB_CONFIG
from app.utils import get_store_based_where_condition

def connect_to_db():
    """連接到數據庫"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

# ==== 療程紀錄功能 ====
def get_remaining_sessions(member_id, therapy_id):
    """計算並【直接回傳】剩餘次數這個數字"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 計算購買總量
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as total_purchased
                FROM therapy_sell WHERE member_id = %s AND therapy_id = %s
            """, (member_id, therapy_id))
            purchased_result = cursor.fetchone()
            total_purchased = int(float(purchased_result['total_purchased'])) if purchased_result and purchased_result.get('total_purchased') is not None else 0
            
            # 計算已使用量
            cursor.execute("""
                SELECT COALESCE(SUM(deduct_sessions), 0) as total_used
                FROM therapy_record WHERE member_id = %s AND therapy_id = %s
            """, (member_id, therapy_id))
            used_result = cursor.fetchone()
            total_used = int(used_result['total_used']) if used_result and used_result.get('total_used') is not None else 0
            
            return total_purchased - total_used
    finally:
        conn.close()

def get_all_therapy_records():
    """獲取所有療程紀錄，並直接讀取已儲存的剩餘堂數快照"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # --- SQL查詢簡化：直接選取 remaining_sessions_at_time 欄位 ---
            sql = """
                SELECT
                    tr.therapy_record_id, tr.date, tr.note,
                    tr.member_id, m.member_code, m.name AS member_name,
                    tr.therapy_id, t.name AS package_name, t.content AS therapy_content,
                    tr.staff_id, s.name AS staff_name,
                    tr.remaining_sessions_at_time AS remaining_sessions
                FROM therapy_record tr
                LEFT JOIN member m ON tr.member_id = m.member_id
                LEFT JOIN therapy t ON tr.therapy_id = t.therapy_id
                LEFT JOIN staff s ON tr.staff_id = s.staff_id
                ORDER BY tr.date DESC, tr.therapy_record_id DESC
            """
            cursor.execute(sql)
            return cursor.fetchall()
    finally:
        conn.close()

def get_therapy_records_by_store(store_id):
    """獲取特定店鋪的療程紀錄"""
    conn = connect_to_db()
    with conn.cursor() as cursor:
        query = """
            SELECT
                tr.therapy_record_id,
                m.member_id,
                m.member_code,
                m.name as member_name,
                s.store_id,
                s.store_name as store_name,
                st.staff_id,
                st.name as staff_name,
                tr.date,
                tr.note,
                tr.therapy_id,
                t.name as package_name,
                t.content as therapy_content,
                tr.deduct_sessions
            FROM therapy_record tr
            LEFT JOIN member m ON tr.member_id = m.member_id
            LEFT JOIN store s ON tr.store_id = s.store_id
            LEFT JOIN staff st ON tr.staff_id = st.staff_id
            LEFT JOIN therapy t ON tr.therapy_id = t.therapy_id
            WHERE tr.store_id = %s
            ORDER BY tr.date DESC, tr.therapy_record_id DESC
        """
        cursor.execute(query, (store_id,))
        result = cursor.fetchall()
        
        # 處理日期格式並計算剩餘次數
        for record in result:
            if record.get('date'):
                record['date'] = record['date'].strftime('%Y-%m-%d')
            if record.get('member_id') and record.get('therapy_id'):
                record['remaining_sessions'] = get_remaining_sessions(
                    record['member_id'], 
                    record['therapy_id']
                )
                
    conn.close()
    return result

def search_therapy_records(filters):
    """根據多重條件搜尋療程紀錄，並逐筆計算剩餘堂數"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # SQL 查詢本身不變
            sql = """
                SELECT
                    tr.therapy_record_id, tr.date, tr.note,
                    tr.member_id, m.member_code, m.name AS member_name,
                    tr.therapy_id, t.name AS package_name, t.content AS therapy_content,
                    tr.staff_id, s.name AS staff_name,
                    tr.remaining_sessions_at_time AS remaining_sessions
                FROM therapy_record tr
                LEFT JOIN member m ON tr.member_id = m.member_id
                LEFT JOIN therapy t ON tr.therapy_id = t.therapy_id
                LEFT JOIN staff s ON tr.staff_id = s.staff_id
                WHERE 1=1
            """
            
            sql_params = []
            
            # 動態組合 WHERE 篩選條件 (邏輯不變)
            if filters.get('keyword'):
                sql += " AND (m.name LIKE %s OR m.phone LIKE %s OR tr.member_id LIKE %s OR m.member_code LIKE %s)"
                like_keyword = f"%{filters['keyword']}%"
                sql_params.extend([like_keyword, like_keyword, like_keyword, like_keyword])
            
            if filters.get('startDate'):
                sql += " AND tr.date >= %s"
                sql_params.append(filters['startDate'])

            if filters.get('endDate'):
                sql += " AND tr.date <= %s"
                sql_params.append(params['endDate'])

            if filters.get('therapist'):
                sql += " AND tr.staff_id = %s"
                sql_params.append(filters['therapist'])

            if filters.get('packageName'):
                sql += " AND tr.therapy_id = %s"
                sql_params.append(filters['packageName'])

            # 權限過濾
            where_clause, store_params = get_store_based_where_condition('tr') 
            sql += where_clause
            sql_params.extend(store_params)

            sql += " ORDER BY tr.date DESC, tr.therapy_record_id DESC"
            
            cursor.execute(sql, sql_params)
            # 因為已在 SQL 中處理，不再需要 for 迴圈計算
            return cursor.fetchall()
    finally:
        conn.close()

def get_therapy_record_by_id(record_id):
    """獲取單一療程紀錄"""
    conn = connect_to_db()
    with conn.cursor() as cursor:
        query = """
            SELECT
                tr.therapy_record_id,
                m.member_id,
                m.member_code,
                m.name as member_name,
                s.store_id,
                s.store_name as store_name,
                st.staff_id,
                st.name as staff_name,
                tr.date,
                tr.note,
                tr.therapy_id,
                t.name as package_name,
                t.content as therapy_content,
                tr.deduct_sessions
            FROM therapy_record tr
            LEFT JOIN member m ON tr.member_id = m.member_id
            LEFT JOIN store s ON tr.store_id = s.store_id
            LEFT JOIN staff st ON tr.staff_id = st.staff_id
            LEFT JOIN therapy t ON tr.therapy_id = t.therapy_id
            WHERE tr.therapy_record_id = %s
        """
        cursor.execute(query, (record_id,))
        result = cursor.fetchone()
        
        # 處理日期格式並計算剩餘次數
        if result:
            if result.get('date'):
                result['date'] = result['date'].strftime('%Y-%m-%d')
            if result.get('member_id') and result.get('therapy_id'):
                # 直接接收數字
                result['remaining_sessions'] = get_remaining_sessions(
                    result['member_id'], 
                    result['therapy_id']
                )
            
    conn.close()
    return result

def insert_therapy_record(data):
    """新增療程紀錄，並儲存當下的剩餘堂數快照"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            member_id = data.get("member_id")
            therapy_id = data.get("therapy_id")
            deduct_sessions = int(data.get("deduct_sessions", 1))

            sessions_before_use = get_remaining_sessions(member_id, therapy_id)
            remaining_snapshot = sessions_before_use - deduct_sessions
            if remaining_snapshot < 0:
                raise ValueError("扣除堂數大於剩餘堂數")

            sql = """
                INSERT INTO therapy_record (
                    member_id, store_id, staff_id, date, note, therapy_id, deduct_sessions, remaining_sessions_at_time
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                member_id, data.get("store_id"), data.get("staff_id"),
                data.get("date"), data.get("note"), therapy_id,
                deduct_sessions, remaining_snapshot
            )
            cursor.execute(sql, values)
            record_id = conn.insert_id()
            
        conn.commit()
        return {"success": True, "id": record_id}
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def update_therapy_record(record_id, data):
    """更新療程紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            member_id = data.get("member_id")
            therapy_id = data.get("therapy_id")
            deduct_sessions = int(data.get("deduct_sessions", 1))

            cursor.execute("SELECT deduct_sessions FROM therapy_record WHERE therapy_record_id = %s", (record_id,))
            existing = cursor.fetchone()
            current_deduct = int(existing.get("deduct_sessions", 0)) if existing else 0

            sessions_before_use = get_remaining_sessions(member_id, therapy_id) + current_deduct
            remaining_snapshot = sessions_before_use - deduct_sessions
            if remaining_snapshot < 0:
                raise ValueError("扣除堂數大於剩餘堂數")

            query = """
                UPDATE therapy_record
                SET member_id = %s,
                    store_id = %s,
                    staff_id = %s,
                    date = %s,
                    note = %s,
                    therapy_id = %s,
                    deduct_sessions = %s,
                    remaining_sessions_at_time = %s
                WHERE therapy_record_id = %s
            """
            values = (
                member_id,
                data.get("store_id"),
                data.get("staff_id"),
                data.get("date"),
                data.get("note"),
                therapy_id,
                deduct_sessions,
                remaining_snapshot,
                record_id
            )
            cursor.execute(query, values)
            
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def delete_therapy_record(record_id):
    """刪除療程紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = "DELETE FROM therapy_record WHERE therapy_record_id = %s"
            cursor.execute(query, (record_id,))
            
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def export_therapy_records(store_id=None):
    """匯出療程紀錄（可選擇性根據商店ID過濾）"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            if store_id:
                query = """
                    SELECT tr.therapy_record_id,
                           m.member_id,
                           m.member_code,
                           m.name as member_name,
                           s.name as store_name,
                           st.name as staff_name,
                           tr.date,
                           tr.note
                    FROM therapy_record tr
                    LEFT JOIN member m ON tr.member_id = m.member_id
                    LEFT JOIN store s ON tr.store_id = s.store_id
                    LEFT JOIN staff st ON tr.staff_id = st.staff_id
                    WHERE tr.store_id = %s
                    ORDER BY tr.date DESC, tr.therapy_record_id DESC
                """
                cursor.execute(query, (store_id,))
            else:
                query = """
                    SELECT tr.therapy_record_id,
                           m.member_id,
                           m.member_code,
                           m.name as member_name,
                           s.name as store_name,
                           st.name as staff_name,
                           tr.date,
                           tr.note
                    FROM therapy_record tr
                    LEFT JOIN member m ON tr.member_id = m.member_id
                    LEFT JOIN store s ON tr.store_id = s.store_id
                    LEFT JOIN staff st ON tr.staff_id = st.staff_id
                    ORDER BY tr.date DESC, tr.therapy_record_id DESC
                """
                cursor.execute(query)
                
            result = cursor.fetchall()
            
            # 處理日期格式
            for record in result:
                if record.get('日期'):
                    record['日期'] = record['日期'].strftime('%Y-%m-%d')
                    
        return result
    except Exception as e:
        raise e
    finally:
        conn.close()

# ==== 療程銷售功能 ====
def get_all_therapy_sells():
    """獲取所有療程銷售"""
    conn = connect_to_db()
    with conn.cursor() as cursor:
        query = """
            SELECT ts.Order_ID, m.Member_ID, m.Name as MemberName, ts.PurchaseDate, 
                   tp.TherapyContent as PackageName, ts.Sessions, 
                   ts.PaymentMethod, s.Name as StaffName, ts.SaleCategory,
                   ts.Staff_ID, ts.TherapyCode
            FROM therapySell ts
            LEFT JOIN member m ON ts.Member_ID = m.Member_ID
            LEFT JOIN staff s ON ts.Staff_ID = s.Staff_ID
            LEFT JOIN therapypackage tp ON ts.TherapyCode = tp.TherapyCode
            ORDER BY ts.PurchaseDate DESC
        """
        cursor.execute(query)
        result = cursor.fetchall()
    conn.close()
    return result

def search_therapy_sells(keyword):
    """搜尋療程銷售"""
    conn = connect_to_db()
    with conn.cursor() as cursor:
        query = """
            SELECT ts.Order_ID, m.Member_ID, m.Name as MemberName, ts.PurchaseDate, 
                   tp.TherapyContent as PackageName, ts.Sessions, 
                   ts.PaymentMethod, s.Name as StaffName, ts.SaleCategory,
                   ts.Staff_ID, ts.TherapyCode
            FROM therapySell ts
            LEFT JOIN member m ON ts.Member_ID = m.Member_ID
            LEFT JOIN staff s ON ts.Staff_ID = s.Staff_ID
            LEFT JOIN therapypackage tp ON ts.TherapyCode = tp.TherapyCode
            WHERE m.Name LIKE %s OR m.Member_ID LIKE %s OR s.Name LIKE %s
            ORDER BY ts.PurchaseDate DESC
        """
        like = f"%{keyword}%"
        cursor.execute(query, (like, like, like))
        result = cursor.fetchall()
    conn.close()
    return result

def insert_therapy_sell(data, test_mode=False):
    """新增療程銷售"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            if test_mode:
                # 暫時禁用外鍵檢查（僅用於測試）
                cursor.execute("SET FOREIGN_KEY_CHECKS=0")
            
            query = """
                INSERT INTO therapySell (
                    Member_ID, PurchaseDate, TherapyCode, Sessions,
                    PaymentMethod, TransferCode, CardNumber, Staff_ID, SaleCategory
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                data.get("memberId"),
                data.get("purchaseDate"),
                data.get("therapyPackageId"),
                data.get("sessions"),
                data.get("paymentMethod"),
                data.get("transferCode"),
                data.get("cardNumber"),
                data.get("staffId"),
                data.get("saleCategory")
            )
            cursor.execute(query, values)
            
            if test_mode:
                # 重新啟用外鍵檢查
                cursor.execute("SET FOREIGN_KEY_CHECKS=1")
                
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def update_therapy_sell(sale_id, data):
    """更新療程銷售"""
    conn = connect_to_db()
    with conn.cursor() as cursor:
        query = """
            UPDATE therapySell
            SET Member_ID = %s, PurchaseDate = %s, TherapyCode = %s,
                Sessions = %s, PaymentMethod = %s, TransferCode = %s,
                CardNumber = %s, Staff_ID = %s, SaleCategory = %s
            WHERE Order_ID = %s
        """
        values = (
            data.get("memberId"),
            data.get("purchaseDate"),
            data.get("therapyPackageId"),
            data.get("sessions"),
            data.get("paymentMethod"),
            data.get("transferCode"),
            data.get("cardNumber"),
            data.get("staffId"),
            data.get("saleCategory"),
            sale_id
        )
        cursor.execute(query, values)
    conn.commit()
    conn.close()

def delete_therapy_sell(sale_id):
    """刪除療程銷售"""
    conn = connect_to_db()
    with conn.cursor() as cursor:
        query = "DELETE FROM therapySell WHERE Order_ID = %s"
        cursor.execute(query, (sale_id,))
    conn.commit()
    conn.close()

def get_all_therapies_for_dropdown():
    """獲取所有療程的 ID 和名稱，用於下拉選單。"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            sql = "SELECT therapy_id, name, price FROM therapy ORDER BY name"
            cursor.execute(sql)
            return cursor.fetchall()
    finally:
        conn.close()


def create_therapy(data: dict):
    """新增一筆療程套餐資料"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = (
                "INSERT INTO therapy (code, name, price, content) "
                "VALUES (%s, %s, %s, %s)"
            )
            cursor.execute(query, (
                data.get("code"),
                data.get("name"),
                data.get("price"),
                data.get("content", None),
            ))
            therapy_id = conn.insert_id()
        conn.commit()
        return therapy_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
