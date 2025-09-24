# server/app/models/medical_record_model.py
import pymysql
import json
import traceback

from app.config import DB_CONFIG

def connect_to_db():
    """建立資料庫連線，並始終使用 DictCursor 以確保回傳結果為字典格式"""
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

def format_record(record):
    """
    將從資料庫取出的單筆字典 record，格式化為前端需要的【元組 (tuple/array)】結構
    """
    if not record:
        return None
        
    all_history = []
    try:
        # --- 讀取並合併所有相關病史 ---

        # 1. 處理平時症狀 (這部分邏輯是正確的)
        symptom_data = {
            "HPA": json.loads(record.get('HPA_selection') or '[]'),
            "meridian": json.loads(record.get('meridian_selection') or '[]'),
            "neckAndShoulder": json.loads(record.get('neck_and_shoulder_selection') or '[]'),
            "anus": json.loads(record.get('anus_selection') or '[]'),
            "symptomOthers": record.get('symptom_others') or ''
        }
        all_history.extend(symptom_data.get('HPA', []))
        all_history.extend(symptom_data.get('meridian', []))
        all_history.extend(symptom_data.get('neckAndShoulder', []))
        all_history.extend(symptom_data.get('anus', []))
        if symptom_data.get('symptomOthers'):
            all_history.append(symptom_data['symptomOthers'])

        # 2. 處理家族病史 (這部分邏輯是正確的)
        family_history_data = {
            "familyHistory": json.loads(record.get('family_history_selection') or '[]')
        }
        all_history.extend(family_history_data.get('familyHistory', []))

        # *** 核心修正：使用正確的邏輯處理健康狀態 ***
        # 3. 直接解析健康狀態的選項列表 (它本身就是一個 JSON 陣列)
        health_selections_json = record.get('health_status_selection') or '[]'
        health_selections = json.loads(health_selections_json)
        all_history.extend(health_selections)

        # 4. 直接獲取 "其他" 健康狀態的文字並加入
        #    (來自 BASE_MEDICAL_RECORD_QUERY 中的 health_status_others 別名)
        health_others = record.get('health_status_others')
        if health_others:
            all_history.append(health_others)

    except (json.JSONDecodeError, TypeError) as e:
        print(f"Error parsing history JSON for record: {record.get('medical_record_id')}, error: {e}")
        pass

    # 最後，將所有蒐集到的項目合併成一個字串
    # 使用 filter(None, ...) 過濾掉空字串或 None
    medical_history_str = ", ".join(filter(None, all_history))

    cosmetic_surgery_status = 'Yes' if record.get('micro_surgery') is not None else 'No'

    return (
        record.get('medical_record_id'),
        record.get('store_name') or record.get('store_id'),
        record.get('member_code'),
        record.get('name'),
        record.get('height'),
        record.get('weight'),
        record.get('blood_preasure') or '',
        medical_history_str,
        cosmetic_surgery_status,
        record.get('micro_surgery_description') or ''
    )

def format_record_for_edit(record: dict):
    """
    將從資料庫取出的單筆字典 record，格式化為前端「編輯表單」需要的完整 JSON 結構。
    此函式會解析所有 JSON 字串，並預先產生摘要字串。
    """
    if not record:
        return None

    # 初始化所有需要的物件和摘要
    symptom = {}
    family_history = {}
    health_status = {}
    symptom_summary = ""
    family_summary = ""
    health_summary = ""
    
    try:
        # 處理平時症狀
        symptom_selections = {
            "HPA": json.loads(record.get('HPA_selection') or '[]'),
            "meridian": json.loads(record.get('meridian_selection') or '[]'),
            "neckAndShoulder": json.loads(record.get('neck_and_shoulder_selection') or '[]'),
            "anus": json.loads(record.get('anus_selection') or '[]'),
            "symptomOthers": record.get('symptom_others') or ''
        }
        symptom = symptom_selections
        symptom_parts = [item for sublist in symptom_selections.values() for item in (sublist if isinstance(sublist, list) else [sublist])]
        symptom_summary = ", ".join(filter(None, symptom_parts))

        # 處理家族病史
        family_history_list = json.loads(record.get('family_history_selection') or '[]')
        family_history = {"familyHistory": family_history_list, "familyHistoryOthers": ""}
        family_summary = ", ".join(filter(None, family_history_list))
        
        # 處理健康狀態
        health_selections_list = json.loads(record.get('health_status_selection') or '[]')
        health_others_text = record.get('health_status_others') or ''
        health_status = {"selectedStates": health_selections_list, "otherText": health_others_text}
        health_parts = health_selections_list + ([health_others_text] if health_others_text else [])
        health_summary = ", ".join(filter(None, health_parts))

        # 將原始資料庫欄位名轉換為前端需要的 camelCase
        record['memberId'] = record.pop('member_id', None)
        record['bloodPressure'] = record.pop('blood_preasure', None)
        record['cosmeticSurgery'] = record.pop('cosmetic_surgery', 'No')
        record['cosmeticDesc'] = record.pop('micro_surgery_description', None)
        # 將 member_code 轉換為前端使用的 camelCase
        record['memberCode'] = record.pop('member_code', None)
        record['storeName'] = record.pop('store_name', None)
        
        # 將產生的新欄位加入 record 中
        record['symptom'] = symptom
        record['familyHistory'] = family_history
        record['healthStatus'] = health_status
        record['symptomSummary'] = symptom_summary
        record['familySummary'] = family_summary
        record['healthStatusSummary'] = health_summary

    except (json.JSONDecodeError, TypeError) as e:
        print(f"Error parsing JSON for edit record: {record.get('medical_record_id')}, error: {e}")
        pass
        
    return record

# --- 這是本次修正的核心：使用 ANY_VALUE() 解決 only_full_group_by 的問題 ---
BASE_MEDICAL_RECORD_QUERY = """
    SELECT 
        mr.medical_record_id,
        mr.member_id,
        mr.usual_sympton_and_family_history_id,
        mr.height,
        mr.weight,
        mr.micro_surgery,
        mr.remark,
        mr.health_status_id,
        mr.store_id,
        MAX(m.name) as name,
        MAX(m.member_code) as member_code,
        MAX(st.store_name) as store_name,
        MAX(us.HPA_selection) as HPA_selection,
        MAX(us.meridian_selection) as meridian_selection, 
        MAX(us.neck_and_shoulder_selection) as neck_and_shoulder_selection,
        MAX(us.anus_selection) as anus_selection, 
        MAX(us.family_history_selection) as family_history_selection, 
        MAX(us.others) as symptom_others,
        MAX(hs.health_status_selection) as health_status_selection, 
        MAX(hs.others) as health_status_others,
        MAX(ms.micro_surgery_description) as micro_surgery_description,
        MAX(ip.blood_preasure) as blood_preasure,
        CASE WHEN mr.micro_surgery IS NOT NULL THEN 'Yes' ELSE 'No' END as cosmetic_surgery
    FROM medical_record mr
    LEFT JOIN member m ON mr.member_id = m.member_id
    LEFT JOIN usual_sympton_and_family_history us ON mr.usual_sympton_and_family_history_id = us.usual_sympton_and_family_history_id
    LEFT JOIN micro_surgery ms ON mr.micro_surgery = ms.micro_surgery_id
    LEFT JOIN health_status hs ON mr.health_status_id = hs.health_status_id
    LEFT JOIN ipn_pure ip ON mr.member_id = ip.member_id
    LEFT JOIN store st ON mr.store_id = st.store_id
"""

def get_all_medical_records(store_level: str, store_id: int):
    """根據使用者權限獲取健康理療記錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            params = []
            where_clause = ""
            if store_level == "分店":
                where_clause = "WHERE mr.store_id = %s"
                params.append(store_id)
            
            sql = f"""
                {BASE_MEDICAL_RECORD_QUERY}
                {where_clause}
                GROUP BY mr.medical_record_id
                ORDER BY mr.medical_record_id DESC
            """
            
            cursor.execute(sql, tuple(params))
            records = cursor.fetchall()
            return [format_record(record) for record in records]
    finally:
        conn.close()

def search_medical_records(keyword: str, store_level: str, store_id: int):
    """根據關鍵字和使用者權限搜尋健康理療記錄"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            search_keyword = f"%{keyword}%"
            params = [search_keyword, search_keyword]
            
            where_conditions = ["(m.name LIKE %s OR m.member_code LIKE %s)"]
            
            if store_level == "分店":
                where_conditions.append("mr.store_id = %s")
                params.append(store_id)
            
            where_clause = "WHERE " + " AND ".join(where_conditions)

            sql = f"""
                {BASE_MEDICAL_RECORD_QUERY}
                {where_clause}
                GROUP BY mr.medical_record_id
                ORDER BY mr.medical_record_id DESC
            """
            
            cursor.execute(sql, tuple(params))
            records = cursor.fetchall()
            return [format_record(record) for record in records]
    finally:
        conn.close()

def get_medical_record_by_id(record_id: int):
    """透過 ID 獲取單筆健康理療記錄的完整資訊，並為編輯用途進行格式化"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            sql = f"""
                {BASE_MEDICAL_RECORD_QUERY}
                WHERE mr.medical_record_id = %s
                GROUP BY mr.medical_record_id
            """
            cursor.execute(sql, (record_id,))
            record = cursor.fetchone()
            
            # *** 核心修正 ***
            # 使用新的格式化函式來處理資料，使其符合前端編輯表單的需求
            return format_record_for_edit(record)
    finally:
        conn.close()

# create, update, delete 函式保持不變
def create_medical_record(data: dict, store_id: int):
    """新增一筆健康理療記錄，並指定其歸屬的 store_id"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            member_id = data.get('memberId')
            if not member_id or not str(member_id).isdigit():
                 raise ValueError(f"無效的會員ID: {member_id}")

            blood_pressure_value = data.get('bloodPressure')
            if blood_pressure_value:
                cursor.execute("""
                    INSERT INTO ipn_pure (member_id, staff_id, blood_preasure, date, store_id)
                    VALUES (%s, NULL, %s, CURDATE(), %s)
                """, (member_id, blood_pressure_value, store_id))
            
            symptom_data = json.loads(data.get('symptom', '{}'))
            family_data = json.loads(data.get('familyHistory', '{}'))
            health_data = json.loads(data.get('healthStatus', '{}'))

            cursor.execute("""
            INSERT INTO usual_sympton_and_family_history (
                member_id, HPA_selection, meridian_selection, neck_and_shoulder_selection,
                anus_selection, family_history_selection, others
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                member_id, json.dumps(symptom_data.get('HPA', [])), json.dumps(symptom_data.get('meridian', [])),
                json.dumps(symptom_data.get('neckAndShoulder', [])), json.dumps(symptom_data.get('anus', [])),
                json.dumps(family_data.get('familyHistory', [])), symptom_data.get('symptomOthers', '')
            ))
            usual_symptoms_id = cursor.lastrowid
            
            cursor.execute("""
                INSERT INTO health_status (member_id, health_status_selection, others)
                VALUES (%s, %s, %s) """, 
                (member_id, json.dumps(health_data.get('selectedStates', [])), health_data.get('otherText', ''))
            )
            health_status_id = cursor.lastrowid

            micro_surgery_id = None
            if data.get('cosmeticSurgery') == 'Yes':
                cursor.execute("INSERT INTO micro_surgery (micro_surgery_description) VALUES (%s)", (data.get('cosmeticDesc', ''),))
                micro_surgery_id = cursor.lastrowid

            cursor.execute("""
            INSERT INTO medical_record (
                member_id, usual_sympton_and_family_history_id, height, weight, micro_surgery, 
                store_id, remark, health_status_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                member_id, usual_symptoms_id, data.get('height'), data.get('weight'),
                micro_surgery_id, data.get('store_id'), data.get('remark'), health_status_id
            ))
            record_id = cursor.lastrowid
        conn.commit()
        return record_id
    except Exception as e:
        conn.rollback()
        traceback.print_exc()
        raise e
    finally:
        conn.close()

def update_medical_record(record_id, data):
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT member_id, usual_sympton_and_family_history_id, micro_surgery, health_status_id, store_id FROM medical_record WHERE medical_record_id = %s",
                (record_id,),
            )
            related_ids = cursor.fetchone()
            if not related_ids:
                raise ValueError("找不到要更新的紀錄")

            member_id = related_ids['member_id']
            usual_symptoms_id = related_ids['usual_sympton_and_family_history_id']
            micro_surgery_id = related_ids['micro_surgery']
            health_status_id = related_ids['health_status_id']
            store_id = related_ids['store_id']

            blood_pressure_value = data.get('bloodPressure')
            if blood_pressure_value:
                # 檢查該會員是否已有 ipn_pure 紀錄
                cursor.execute("SELECT ipn_pure_id FROM ipn_pure WHERE member_id = %s LIMIT 1", (member_id,))
                existing_ipn_pure = cursor.fetchone()
                if existing_ipn_pure:
                    cursor.execute("UPDATE ipn_pure SET blood_preasure = %s, date = CURDATE() WHERE member_id = %s", (blood_pressure_value, member_id))
                else:
                    cursor.execute(
                        """
                        INSERT INTO ipn_pure (member_id, staff_id, blood_preasure, date, store_id)
                        VALUES (%s, NULL, %s, CURDATE(), %s)
                        """,
                        (member_id, blood_pressure_value, store_id),
                    )


            def _ensure_dict(value):
                if isinstance(value, str):
                    return json.loads(value or '{}')
                if isinstance(value, dict):
                    return value
                return {}

            symptom_data = _ensure_dict(data.get('symptom', {}))
            family_data = _ensure_dict(data.get('familyHistory', {}))
            if usual_symptoms_id:
                cursor.execute("""
                    UPDATE usual_sympton_and_family_history SET
                        HPA_selection = %s, meridian_selection = %s, neck_and_shoulder_selection = %s,
                        anus_selection = %s, family_history_selection = %s, others = %s
                    WHERE usual_sympton_and_family_history_id = %s
                """, (
                    json.dumps(symptom_data.get('HPA', [])), json.dumps(symptom_data.get('meridian', [])),
                    json.dumps(symptom_data.get('neckAndShoulder', [])), json.dumps(symptom_data.get('anus', [])),
                    json.dumps(family_data.get('familyHistory', [])), symptom_data.get('symptomOthers', ''),
                    usual_symptoms_id
                ))

            health_data = _ensure_dict(data.get('healthStatus', {}))
            if health_status_id:
                cursor.execute("""
                    UPDATE health_status SET health_status_selection = %s, others = %s
                    WHERE health_status_id = %s
                """, (
                    json.dumps(health_data.get('selectedStates', [])), health_data.get('otherText', ''),
                    health_status_id
                ))

            new_micro_surgery_fk_id = micro_surgery_id
            should_delete_old_micro_surgery = False
            if data.get('cosmeticSurgery') == 'Yes':
                if micro_surgery_id:
                    cursor.execute("UPDATE micro_surgery SET micro_surgery_description = %s WHERE micro_surgery_id = %s",
                                   (data.get('cosmeticDesc', ''), micro_surgery_id))
                else:
                    cursor.execute("INSERT INTO micro_surgery (micro_surgery_description) VALUES (%s)", (data.get('cosmeticDesc', '')))
                    new_micro_surgery_fk_id = cursor.lastrowid
            else:
                if micro_surgery_id:
                    new_micro_surgery_fk_id = None
                    should_delete_old_micro_surgery = True
            
            cursor.execute("""
                UPDATE medical_record SET height = %s, weight = %s, remark = %s, micro_surgery = %s
                WHERE medical_record_id = %s
            """, (data.get('height'), data.get('weight'), data.get('remark'), new_micro_surgery_fk_id, record_id))

            if should_delete_old_micro_surgery:
                cursor.execute("DELETE FROM micro_surgery WHERE micro_surgery_id = %s", (micro_surgery_id,))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def delete_medical_record(record_id):
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT member_id, usual_sympton_and_family_history_id, micro_surgery, health_status_id FROM medical_record WHERE medical_record_id = %s", (record_id,))
            related_ids = cursor.fetchone()
            if not related_ids:
                return False
            
            member_id = related_ids['member_id']
            usual_sympton_id = related_ids['usual_sympton_and_family_history_id']
            micro_surgery_id = related_ids['micro_surgery']
            health_status_id = related_ids['health_status_id']
            
            cursor.execute("DELETE FROM ipn_pure WHERE member_id = %s", (member_id,))
            cursor.execute("DELETE FROM medical_record WHERE medical_record_id = %s", (record_id,))
            
            if usual_sympton_id:
                cursor.execute("DELETE FROM usual_sympton_and_family_history WHERE usual_sympton_and_family_history_id = %s", (usual_sympton_id,))
            
            if health_status_id:
                 cursor.execute("DELETE FROM health_status WHERE health_status_id = %s", (health_status_id,))

            if micro_surgery_id:
                cursor.execute("DELETE FROM micro_surgery WHERE micro_surgery_id = %s", (micro_surgery_id,))
            
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
