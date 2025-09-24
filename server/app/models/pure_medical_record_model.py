# server/app/models/pure_medical_record_model.py
import pymysql
from app.config import DB_CONFIG
from datetime import datetime
import traceback

def connect_to_db():
    """連接到數據庫"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

def get_all_pure_records(store_level: str, store_id: int, keyword: str = None):
    """
    根據權限和關鍵字獲取所有淨化健康紀錄
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 基礎查詢，關聯 member 和 staff 表以獲取姓名，並包含新欄位
            query = """
            SELECT
                p.ipn_pure_id, p.member_id, m.Name, p.staff_id, s.name as staff_name,
                p.visceral_fat, p.body_fat_percentage, p.blood_preasure, p.basal_metabolic_rate,
                p.date, p.body_age, p.height, p.weight, p.bmi, p.pure_item, p.note,
                p.store_id, st.store_name
            FROM ipn_pure p
            LEFT JOIN member m ON p.member_id = m.member_id
            LEFT JOIN staff s ON p.staff_id = s.staff_id
            LEFT JOIN store st ON p.store_id = st.store_id
            """
            
            params = []
            where_conditions = []

            # 1. 權限過濾
            if store_level == "分店":
                where_conditions.append("p.store_id = %s")
                params.append(store_id)

            # 2. 關鍵字過濾 (對應前端的單一搜尋框)
            if keyword:
                # 搜尋會員姓名、淨化項目、服務人員姓名
                where_conditions.append("(m.Name LIKE %s OR p.pure_item LIKE %s OR s.name LIKE %s)")
                params.extend([f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"])

            if where_conditions:
                query += " WHERE " + " AND ".join(where_conditions)
            
            query += " ORDER BY p.date DESC, p.ipn_pure_id DESC"
            
            cursor.execute(query, tuple(params))
            results = cursor.fetchall()
            
            # 格式化日期以返回給前端
            for record in results:
                if record.get('date'):
                    record['date'] = record['date'].strftime('%Y-%m-%d')
            
            return results
    except Exception as e:
        traceback.print_exc()
        raise e
    finally:
        conn.close()

def add_pure_record(data: dict, store_id: int):
    """添加淨化健康紀錄，並存入 store_id 和 body_fat_percentage"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            if 'date' not in data or not data['date']:
                data['date'] = datetime.now().strftime('%Y-%m-%d')
                
            # 對應前端傳來的 body_fat_percentage 欄位
            sql = """
            INSERT INTO ipn_pure 
            (member_id, staff_id, visceral_fat, body_fat_percentage, blood_preasure, basal_metabolic_rate,
             date, body_age, height, weight, bmi, pure_item, note, store_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                data.get('member_id'), data.get('staff_id'), data.get('visceral_fat'),
                data.get('body_fat_percentage'), # 新增的體脂肪欄位
                data.get('blood_preasure'), data.get('basal_metabolic_rate'),
                data.get('date'), data.get('body_age'), data.get('height'),
                data.get('weight'), data.get('bmi'), data.get('pure_item'),
                data.get('note'), store_id
            )
            cursor.execute(sql, params)
            conn.commit()
            return cursor.lastrowid
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_pure_record_by_id(pure_id: int):
    """根據ID獲取淨化健康紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
            SELECT p.*, m.Name, s.name as staff_name, st.store_name
            FROM ipn_pure p
            LEFT JOIN member m ON p.member_id = m.member_id
            LEFT JOIN staff s ON p.staff_id = s.staff_id
            LEFT JOIN store st ON p.store_id = st.store_id
            WHERE p.ipn_pure_id = %s
            """
            cursor.execute(query, (pure_id,))
            result = cursor.fetchone()
            
            if result and result.get('date'):
                result['date'] = result['date'].strftime('%Y-%m-%d')
                
            return result
    except Exception as e:
        traceback.print_exc()
        raise e
    finally:
        conn.close()

def update_pure_record(pure_id, data):
    """更新淨化健康紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            sql = """
                UPDATE ipn_pure 
                SET member_id = %s, staff_id = %s, visceral_fat = %s, body_fat_percentage = %s,
                    blood_preasure = %s, basal_metabolic_rate = %s, date = %s, body_age = %s, 
                    height = %s, weight = %s, bmi = %s, pure_item = %s, note = %s
                WHERE ipn_pure_id = %s
                """
            params = (
                data.get('member_id'), data.get('staff_id'), data.get('visceral_fat'),
                data.get('body_fat_percentage'), # 新增的體脂肪欄位
                data.get('blood_preasure'), data.get('basal_metabolic_rate'),
                data.get('date'), data.get('body_age'), data.get('height'),
                data.get('weight'), data.get('bmi'), data.get('pure_item'),
                data.get('note'), pure_id
            )
            cursor.execute(sql, params)
            conn.commit()
            return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def delete_pure_record(pure_id):
    """刪除淨化健康紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM ipn_pure WHERE ipn_pure_id = %s", (pure_id,))
            conn.commit()
            return cursor.rowcount > 0 # 返回影響的行數，更精確判斷是否刪除成功
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_pure_records_by_member_id(member_id: int, store_level: str, store_id: int):
    """根據權限獲取特定會員的所有淨化健康紀錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            
            params = [member_id]
            where_conditions = ["p.member_id = %s"]

            if store_level == "分店":
                where_conditions.append("p.store_id = %s")
                params.append(store_id)
            
            where_clause = " AND ".join(where_conditions)

            query = f"""
            SELECT p.ipn_pure_id, p.member_id, m.Name, p.staff_id, s.name as staff_name,
                   p.visceral_fat, p.body_fat_percentage, p.blood_preasure, p.basal_metabolic_rate,
                   p.date, p.body_age, p.height, p.weight, p.bmi, p.pure_item, p.note,
                   p.store_id, st.store_name
            FROM ipn_pure p
            LEFT JOIN member m ON p.member_id = m.member_id
            LEFT JOIN staff s ON p.staff_id = s.staff_id
            LEFT JOIN store st ON p.store_id = st.store_id
            WHERE {where_clause}
            ORDER BY p.date DESC, p.ipn_pure_id DESC
            """
            
            cursor.execute(query, tuple(params))
            results = cursor.fetchall()
            
            for record in results:
                if record.get('date'):
                    record['date'] = record['date'].strftime('%Y-%m-%d')
            
            return results
    except Exception as e:
        traceback.print_exc()
        raise e
    finally:
        conn.close()

def export_pure_records(store_level: str, store_id: int):
    """根據權限導出淨化健康紀錄以供Excel下載"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            
            query = """
            SELECT p.ipn_pure_id as '編號', 
                   m.Name as '姓名', 
                   s.name as '服務人員',
                   p.blood_preasure as '血壓', 
                   p.date as '日期', 
                   p.height as '身高',
                   p.weight as '體重', 
                   p.body_fat_percentage as '體脂肪(%)',
                   p.visceral_fat as '內脂肪', 
                   p.basal_metabolic_rate as '基礎代謝', 
                   p.body_age as '體年齡', 
                   p.bmi as 'BMI', 
                   p.pure_item as '淨化項目',
                   p.note as '備註'
            FROM ipn_pure p
            LEFT JOIN member m ON p.member_id = m.member_id
            LEFT JOIN staff s ON p.staff_id = s.staff_id
            """
            
            params = []
            where_conditions = []
            if store_level == "分店":
                where_conditions.append("p.store_id = %s")
                params.append(store_id)

            if where_conditions:
                query += " WHERE " + " AND ".join(where_conditions)
            
            query += " ORDER BY p.date DESC, p.ipn_pure_id DESC"
            
            cursor.execute(query, tuple(params))
            results = cursor.fetchall()
            
            for record in results:
                if record.get('日期'):
                    record['日期'] = record['日期'].strftime('%Y-%m-%d')
            
            return results
    except Exception as e:
        traceback.print_exc()
        raise e
    finally:
        conn.close()

