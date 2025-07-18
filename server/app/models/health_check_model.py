import pymysql
import json
from app.config import DB_CONFIG

def get_all_health_checks():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            sql = """
            SELECT 
                hc.health_check_id, hc.member_id, m.name, hc.height, hc.weight,
                us.HPA_selection, us.meridian_selection, us.neck_and_shoulder_selection, 
                us.anus_selection, us.family_history_selection, 
                CASE WHEN hc.micro_surgery IS NOT NULL THEN 1 ELSE 0 END as micro_surgery, 
                ms.micro_surgery_description
            FROM health_check hc
            LEFT JOIN member m ON hc.member_id = m.member_id
            LEFT JOIN usual_sympton_and_family_history us ON hc.usual_sympton_and_family_history_id = us.usual_sympton_and_family_history_id
            LEFT JOIN micro_surgery ms ON hc.micro_surgery = ms.micro_surgery_id
            ORDER BY hc.health_check_id DESC
            """
            cursor.execute(sql)
            records = cursor.fetchall()
            
            # 重新格式化資料以符合前端期望
            formatted_records = []
            for record in records:
                # 組合病史為 JSON 格式
                medical_history = {}
                if record[5]:  # HPA_selection
                    medical_history["HPA"] = [record[5]]
                if record[6]:  # meridian_selection
                    medical_history["Meridian"] = [record[6]]
                if record[7]:  # neck_and_shoulder_selection
                    medical_history["Neck"] = [record[7]]
                if record[8]:  # anus_selection
                    medical_history["Anus"] = [record[8]]
                if record[9]:  # family_history_selection
                    medical_history["Family"] = [record[9]]
                
                medical_history_json = json.dumps(medical_history)
                
                # 建立新的記錄，按照舊格式排列
                formatted_record = (
                    record[0],  # health_check_id
                    record[1],  # member_id
                    record[2],  # name
                    record[3],  # height
                    record[4],  # weight
                    "",  # 血壓 (暫無對應欄位)
                    medical_history_json,  # 病史
                    record[10],  # micro_surgery
                    record[11] if record[11] else "",  # micro_surgery_description
                    None,  # BodyFat
                    None,  # VisceralFat
                    None,  # BasalMetabolism
                    None,  # BodyAge
                    None,  # BMI
                    record[11] if record[11] else "",  # Notes (使用微整型描述作為備註)
                    None   # Date
                )
                formatted_records.append(formatted_record)
                
            return formatted_records
    finally:
        conn.close()

def search_health_checks(keyword):
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            sql = """
            SELECT 
                hc.health_check_id, hc.member_id, m.name, hc.height, hc.weight,
                us.HPA_selection, us.meridian_selection, us.neck_and_shoulder_selection, 
                us.anus_selection, us.family_history_selection, 
                CASE WHEN hc.micro_surgery IS NOT NULL THEN 1 ELSE 0 END as micro_surgery, 
                ms.micro_surgery_description
            FROM health_check hc
            LEFT JOIN member m ON hc.member_id = m.member_id
            LEFT JOIN usual_sympton_and_family_history us ON hc.usual_sympton_and_family_history_id = us.usual_sympton_and_family_history_id
            LEFT JOIN micro_surgery ms ON hc.micro_surgery = ms.micro_surgery_id
            WHERE 
                m.name LIKE %s OR 
                CAST(hc.member_id AS CHAR) LIKE %s
            ORDER BY hc.health_check_id DESC
            """
            search_param = f"%{keyword}%"
            cursor.execute(sql, (search_param, search_param))
            records = cursor.fetchall()
            
            # 重新格式化資料以符合前端期望
            formatted_records = []
            for record in records:
                # 組合病史為 JSON 格式
                medical_history = {}
                if record[5]:  # HPA_selection
                    medical_history["HPA"] = [record[5]]
                if record[6]:  # meridian_selection
                    medical_history["Meridian"] = [record[6]]
                if record[7]:  # neck_and_shoulder_selection
                    medical_history["Neck"] = [record[7]]
                if record[8]:  # anus_selection
                    medical_history["Anus"] = [record[8]]
                if record[9]:  # family_history_selection
                    medical_history["Family"] = [record[9]]
                
                medical_history_json = json.dumps(medical_history)
                
                # 建立新的記錄，按照舊格式排列
                formatted_record = (
                    record[0],  # health_check_id
                    record[1],  # member_id
                    record[2],  # name
                    record[3],  # height
                    record[4],  # weight
                    "",  # 血壓 (暫無對應欄位)
                    medical_history_json,  # 病史
                    record[10],  # micro_surgery
                    record[11] if record[11] else "",  # micro_surgery_description
                    None,  # BodyFat
                    None,  # VisceralFat
                    None,  # BasalMetabolism
                    None,  # BodyAge
                    None,  # BMI
                    record[11] if record[11] else "",  # Notes (使用微整型描述作為備註)
                    None   # Date
                )
                formatted_records.append(formatted_record)
                
            return formatted_records
    finally:
        conn.close()

def get_member_health_check(member_id):
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            sql = """
            SELECT 
                hc.health_check_id, hc.member_id, m.name, hc.height, hc.weight,
                us.HPA_selection, us.meridian_selection, us.neck_and_shoulder_selection, 
                us.anus_selection, us.family_history_selection, 
                CASE WHEN hc.micro_surgery IS NOT NULL THEN 1 ELSE 0 END as micro_surgery, 
                ms.micro_surgery_description
            FROM health_check hc
            LEFT JOIN member m ON hc.member_id = m.member_id
            LEFT JOIN usual_sympton_and_family_history us ON hc.usual_sympton_and_family_history_id = us.usual_sympton_and_family_history_id
            LEFT JOIN micro_surgery ms ON hc.micro_surgery = ms.micro_surgery_id
            WHERE hc.member_id = %s
            ORDER BY hc.health_check_id DESC
            """
            cursor.execute(sql, (member_id,))
            record = cursor.fetchone()
            
            if not record:
                return None
                
            # 組合病史為 JSON 格式
            medical_history = {}
            if record[5]:  # HPA_selection
                medical_history["HPA"] = [record[5]]
            if record[6]:  # meridian_selection
                medical_history["Meridian"] = [record[6]]
            if record[7]:  # neck_and_shoulder_selection
                medical_history["Neck"] = [record[7]]
            if record[8]:  # anus_selection
                medical_history["Anus"] = [record[8]]
            if record[9]:  # family_history_selection
                medical_history["Family"] = [record[9]]
            
            medical_history_json = json.dumps(medical_history)
            
            # 建立新的記錄，按照舊格式排列
            formatted_record = (
                record[0],  # health_check_id
                record[1],  # member_id
                record[2],  # name
                record[3],  # height
                record[4],  # weight
                "",  # 血壓 (暫無對應欄位)
                medical_history_json,  # 病史
                record[10],  # micro_surgery
                record[11] if record[11] else "",  # micro_surgery_description
                None,  # BodyFat
                None,  # VisceralFat
                None,  # BasalMetabolism
                None,  # BodyAge
                None,  # BMI
                record[11] if record[11] else "",  # Notes (使用微整型描述作為備註)
                None   # Date
            )
            
            return formatted_record
    finally:
        conn.close()

def create_health_check(data):
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            # 嘗試通過姓名查找會員ID
            if data.get('memberId') and not str(data.get('memberId')).isdigit():
                member_name = data.get('memberId')
                cursor.execute("SELECT member_id FROM member WHERE name = %s", (member_name,))
                member = cursor.fetchone()
                if member:
                    member_id = member[0]
                else:
                    # 如果找不到會員，返回錯誤
                    raise ValueError(f"找不到名為 '{member_name}' 的會員")
            else:
                member_id = data.get('memberId')
            
            # 先檢查或創建常見症狀和家族病史記錄
            usual_sympton_id = None
            
            if data.get('medicalHistory'):
                try:
                    medical_history = json.loads(data.get('medicalHistory')) if isinstance(data.get('medicalHistory'), str) else data.get('medicalHistory')
                    
                    # 創建常見症狀和家族病史記錄
                    cursor.execute("""
                    INSERT INTO usual_sympton_and_family_history (
                        member_id, HPA_selection, meridian_selection, neck_and_shoulder_selection,
                        anus_selection, family_history_selection, others
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        member_id,
                        medical_history.get('HPA', [''])[0] if medical_history.get('HPA') else None,
                        medical_history.get('Meridian', [''])[0] if medical_history.get('Meridian') else None,
                        medical_history.get('Neck', [''])[0] if medical_history.get('Neck') else None,
                        medical_history.get('Anus', [''])[0] if medical_history.get('Anus') else None,
                        medical_history.get('Family', [''])[0] if medical_history.get('Family') else None,
                        json.dumps(medical_history) if medical_history else None
                    ))
                    conn.commit()
                    usual_sympton_id = cursor.lastrowid
                except Exception as e:
                    print(f"解析醫療病史時出錯: {e}")
                    # 如果失敗，使用默認空值
                    pass
            
            # 檢查或創建微整型記錄
            micro_surgery_id = None
            if data.get('microSurgery') == 1 or data.get('microSurgery') == '1' or data.get('microSurgery') is True:
                cursor.execute("""
                INSERT INTO micro_surgery (micro_surgery_selection, micro_surgery_description)
                VALUES (%s, %s)
                """, (
                    '有微整型',
                    data.get('microSurgeryNotes', '')
                ))
                conn.commit()
                micro_surgery_id = cursor.lastrowid
            
            # 創建健康檢查記錄
            cursor.execute("""
            INSERT INTO health_check (
                member_id, usual_sympton_and_family_history_id, height, weight, micro_surgery
            ) VALUES (%s, %s, %s, %s, %s)
            """, (
                member_id,
                usual_sympton_id,
                data.get('height', 0),
                data.get('weight', 0),
                micro_surgery_id
            ))
            
            conn.commit()
            
            # 獲取新插入記錄的ID
            check_id = cursor.lastrowid
            
            return check_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def update_health_check(check_id, data):
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            # 首先檢索現有記錄
            cursor.execute("""
            SELECT 
                member_id, usual_sympton_and_family_history_id, micro_surgery
            FROM health_check 
            WHERE health_check_id = %s
            """, (check_id,))
            
            existing_record = cursor.fetchone()
            if not existing_record:
                return False
                
            member_id, usual_sympton_id, micro_surgery_id = existing_record
            
            # 更新基本健康檢查資料
            health_check_update = []
            health_check_values = []
            
            if 'height' in data:
                health_check_update.append("height = %s")
                health_check_values.append(data['height'])
                
            if 'weight' in data:
                health_check_update.append("weight = %s")
                health_check_values.append(data['weight'])
            
            # 更新微整型記錄
            if 'microSurgery' in data or 'microSurgeryNotes' in data:
                new_micro_surgery = data.get('microSurgery')
                new_micro_notes = data.get('microSurgeryNotes', '')
                
                if (new_micro_surgery == 1 or new_micro_surgery == '1' or new_micro_surgery is True):
                    # 需要微整型記錄
                    if micro_surgery_id:
                        # 更新現有記錄
                        cursor.execute("""
                        UPDATE micro_surgery 
                        SET micro_surgery_description = %s
                        WHERE micro_surgery_id = %s
                        """, (new_micro_notes, micro_surgery_id))
                    else:
                        # 創建新記錄
                        cursor.execute("""
                        INSERT INTO micro_surgery (micro_surgery_selection, micro_surgery_description)
                        VALUES (%s, %s)
                        """, ('有微整型', new_micro_notes))
                        micro_surgery_id = cursor.lastrowid
                        health_check_update.append("micro_surgery = %s")
                        health_check_values.append(micro_surgery_id)
                else:
                    # 不需要微整型記錄
                    health_check_update.append("micro_surgery = NULL")
            
            # 更新醫療病史
            if 'medicalHistory' in data and usual_sympton_id:
                try:
                    medical_history = json.loads(data['medicalHistory']) if isinstance(data['medicalHistory'], str) else data['medicalHistory']
                    
                    cursor.execute("""
                    UPDATE usual_sympton_and_family_history
                    SET HPA_selection = %s, meridian_selection = %s, neck_and_shoulder_selection = %s,
                        anus_selection = %s, family_history_selection = %s, others = %s
                    WHERE usual_sympton_and_family_history_id = %s
                    """, (
                        medical_history.get('HPA', [''])[0] if medical_history.get('HPA') else None,
                        medical_history.get('Meridian', [''])[0] if medical_history.get('Meridian') else None,
                        medical_history.get('Neck', [''])[0] if medical_history.get('Neck') else None,
                        medical_history.get('Anus', [''])[0] if medical_history.get('Anus') else None,
                        medical_history.get('Family', [''])[0] if medical_history.get('Family') else None,
                        json.dumps(medical_history) if medical_history else None,
                        usual_sympton_id
                    ))
                except Exception as e:
                    print(f"更新醫療病史時出錯: {e}")
            
            # 如果有健康檢查數據需要更新
            if health_check_update:
                sql = f"""
                UPDATE health_check 
                SET {', '.join(health_check_update)}
                WHERE health_check_id = %s
                """
                health_check_values.append(check_id)
                cursor.execute(sql, health_check_values)
            
            conn.commit()
            return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def delete_health_check(check_id):
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            # 首先獲取關聯的 IDs
            cursor.execute("""
            SELECT usual_sympton_and_family_history_id, micro_surgery
            FROM health_check
            WHERE health_check_id = %s
            """, (check_id,))
            
            related_ids = cursor.fetchone()
            if not related_ids:
                return False
                
            usual_sympton_id, micro_surgery_id = related_ids
            
            # 刪除健康檢查記錄
            cursor.execute("DELETE FROM health_check WHERE health_check_id = %s", (check_id,))
            
            # 刪除相關的常見症狀和家族病史記錄
            if usual_sympton_id:
                cursor.execute("""
                DELETE FROM usual_sympton_and_family_history 
                WHERE usual_sympton_and_family_history_id = %s
                """, (usual_sympton_id,))
            
            # 刪除相關的微整型記錄
            if micro_surgery_id:
                cursor.execute("DELETE FROM micro_surgery WHERE micro_surgery_id = %s", (micro_surgery_id,))
            
            conn.commit()
            return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_all_health_checks_for_export():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            sql = """
            SELECT 
                hc.health_check_id, m.name, hc.member_id, hc.height, hc.weight,
                '',  -- 舊格式的血壓欄位，現在無對應
                CASE WHEN hc.micro_surgery IS NOT NULL THEN '是' ELSE '否' END as micro_surgery,
                ms.micro_surgery_description,
                NULL as BodyFat, NULL as VisceralFat,
                NULL as BasalMetabolism, NULL as BodyAge, NULL as BMI, 
                ms.micro_surgery_description as Notes
            FROM health_check hc
            LEFT JOIN member m ON hc.member_id = m.member_id
            LEFT JOIN micro_surgery ms ON hc.micro_surgery = ms.micro_surgery_id
            ORDER BY hc.health_check_id DESC
            """
            cursor.execute(sql)
            records = cursor.fetchall()
            return records
    finally:
        conn.close() 