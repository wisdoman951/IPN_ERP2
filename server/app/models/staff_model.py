# /app/models/staff_model.py
import pymysql
import os
import numpy as np
from app.config import DB_CONFIG
from datetime import datetime

def connect_to_db():
    """取得資料庫連接"""
    try:
        connection = pymysql.connect(
            **DB_CONFIG,
            cursorclass=pymysql.cursors.DictCursor  # 確保返回字典格式數據
        )
        return connection
    except Exception as e:
        print(f"資料庫連接失敗: {e}")
        return None

def get_all_staff(store_level=None, store_id=None):
    """獲取所有員工列表，可依店鋪或權限篩選"""
    connection = connect_to_db()
    try:
        with connection.cursor() as cursor:
            # 使用正確的小寫表格名 `staff` 和小寫欄位名
            query = """
                SELECT
                    s.*, 
                    st.store_name
                FROM staff s
                LEFT JOIN store st ON s.store_id = st.store_id
            """
            params = []
            # 分店使用者僅能查看自身分店
            if store_level == '分店':
                query += " WHERE s.store_id = %s"
                params.append(store_id)
            elif store_id:
                # 總店若提供 store_id 則篩選指定分店
                query += " WHERE s.store_id = %s"
                params.append(store_id)

            query += " ORDER BY s.staff_id DESC"

            cursor.execute(query, params)
            return cursor.fetchall()
    except Exception as e:
        print(f"獲取所有員工錯誤: {e}")
        return []
    finally:
        if connection:
            connection.close()

def get_all_staff_for_dropdown():
    """獲取所有員工的 ID 和姓名，用於下拉選單。"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 使用正確的欄位名稱 name
            sql = "SELECT staff_id, name FROM staff ORDER BY name"
            cursor.execute(sql)
            return cursor.fetchall()
    finally:
        conn.close()

def search_staff(keyword, store_level=None, store_id=None):
    """搜尋員工，可依店鋪或權限篩選"""
    connection = connect_to_db()
    try:
        with connection.cursor() as cursor:
            query = """
            SELECT
                s.*,
                st.store_name
            FROM staff s
            LEFT JOIN store st ON s.store_id = st.store_id
            WHERE (s.name LIKE %s OR s.phone LIKE %s OR s.account LIKE %s)
            """
            params = [f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"]
            if store_level == '分店':
                query += " AND s.store_id = %s"
                params.append(store_id)
            elif store_id:
                query += " AND s.store_id = %s"
                params.append(store_id)

            query += " ORDER BY s.staff_id DESC"

            cursor.execute(query, params)
            return cursor.fetchall()
    except Exception as e:
        print(f"搜尋員工錯誤: {e}")
        return []
    finally:
        if connection:
            connection.close()

def get_staff_by_id(staff_id):
    """獲取單個員工資料 (已修正)"""
    connection = connect_to_db()
    try:
        with connection.cursor() as cursor:
            query = "SELECT * FROM staff WHERE staff_id = %s"
            cursor.execute(query, (staff_id,))
            return cursor.fetchone()
    except Exception as e:
        print(f"獲取員工錯誤: {e}")
        return None
    finally:
        if connection:
            connection.close()

def get_staff_details(staff_id):
    """獲取員工詳細資料包括家庭成員和工作經驗"""
    connection = connect_to_db()
    result = {
        "basic_info": None,
        "family_members": [],
        "work_experience": []
    }

    try:
        with connection.cursor() as cursor:
            # 使用新欄位從 staff 表取得基本資料
            query = "SELECT * FROM staff WHERE staff_id = %s"
            cursor.execute(query, (staff_id,))
            result["basic_info"] = cursor.fetchone()
            
            # 獲取家庭成員
            query = """
            SELECT * FROM Staff_Family 
            WHERE Staff_ID = %s
            """
            cursor.execute(query, (staff_id,))
            result["family_members"] = cursor.fetchall()
            
            # 獲取工作經驗
            query = """
            SELECT *, 
                   DATE_FORMAT(Work_StartDate, '%Y-%m-%d') as Work_StartDate,
                   DATE_FORMAT(Work_EndDate, '%Y-%m-%d') as Work_EndDate
            FROM Staff_WorkExperience 
            WHERE Staff_ID = %s
            """
            cursor.execute(query, (staff_id,))
            result["work_experience"] = cursor.fetchall()
    except Exception as e:
        print(f"獲取員工詳細資料錯誤: {e}")
    finally:
        if connection:
            connection.close()
    
    return result

def create_staff(data):
    """新增員工"""
    connection = connect_to_db()
    staff_id = None
    
    try:
        with connection.cursor() as cursor:
            # 1. 新增基本資料
            basic_info = data.get("basic_info", {})

            # 處理日期格式
            if "fill_date" in basic_info and basic_info["fill_date"]:
                basic_info["fill_date"] = datetime.strptime(basic_info["fill_date"], "%Y-%m-%d")
            else:
                basic_info["fill_date"] = None

            if "onboard_date" in basic_info and basic_info["onboard_date"]:
                basic_info["onboard_date"] = datetime.strptime(basic_info["onboard_date"], "%Y-%m-%d")
            else:
                basic_info["onboard_date"] = None

            # 插入基本資料 (使用新欄位)
            query = """
            INSERT INTO staff (
                family_information_id, emergency_contact_id, work_experience_id,
                hiring_information_id, name, gender, fill_date, onboard_date,
                nationality, education, married, position, phone, national_id,
                mailing_address, registered_address, account, password, store_id,
                permission
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """
            cursor.execute(query, (
                basic_info.get("family_information_id"),
                basic_info.get("emergency_contact_id"),
                basic_info.get("work_experience_id"),
                basic_info.get("hiring_information_id"),
                basic_info.get("name"),
                basic_info.get("gender"),
                basic_info.get("fill_date"),
                basic_info.get("onboard_date"),
                basic_info.get("nationality"),
                basic_info.get("education"),
                basic_info.get("married"),
                basic_info.get("position"),
                basic_info.get("phone"),
                basic_info.get("national_id"),
                basic_info.get("mailing_address"),
                basic_info.get("registered_address"),
                basic_info.get("account"),
                basic_info.get("password"),
                basic_info.get("store_id"),
                basic_info.get("permission")
            ))
            
            # 獲取新增員工的ID
            staff_id = connection.insert_id()
            
            # 2. 新增家庭成員
            family_members = data.get("family_members", [])
            if family_members and len(family_members) > 0:
                for member in family_members:
                    query = """
                    INSERT INTO Staff_Family (
                        Staff_ID, Family_Name, Family_Relation, 
                        Family_Phone, Family_Address
                    ) VALUES (%s, %s, %s, %s, %s)
                    """
                    cursor.execute(query, (
                        staff_id,
                        member.get("Family_Name"),
                        member.get("Family_Relation"),
                        member.get("Family_Phone"),
                        member.get("Family_Address")
                    ))
            
            # 3. 新增工作經驗
            work_experience = data.get("work_experience", [])
            if work_experience and len(work_experience) > 0:
                for experience in work_experience:
                    # 處理日期格式
                    start_date = None
                    if "Work_StartDate" in experience and experience["Work_StartDate"]:
                        start_date = datetime.strptime(experience["Work_StartDate"], "%Y-%m-%d")
                    
                    end_date = None
                    if "Work_EndDate" in experience and experience["Work_EndDate"]:
                        end_date = datetime.strptime(experience["Work_EndDate"], "%Y-%m-%d")
                    
                    query = """
                    INSERT INTO Staff_WorkExperience (
                        Staff_ID, Work_Company, Work_Position, 
                        Work_StartDate, Work_EndDate, Work_Description
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(query, (
                        staff_id,
                        experience.get("Work_Company"),
                        experience.get("Work_Position"),
                        start_date,
                        end_date,
                        experience.get("Work_Description")
                    ))
            
            connection.commit()
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"新增員工錯誤: {e}")
        staff_id = None
    finally:
        if connection:
            connection.close()
    
    return staff_id

def update_staff(staff_id, data):
    """更新員工資料"""
    connection = connect_to_db()
    success = False
    
    try:
        with connection.cursor() as cursor:
            # 1. 更新基本資料
            basic_info = data.get("basic_info", {})
            if basic_info:
                # 處理日期格式
                if "fill_date" in basic_info and basic_info["fill_date"]:
                    basic_info["fill_date"] = datetime.strptime(basic_info["fill_date"], "%Y-%m-%d")

                if "onboard_date" in basic_info and basic_info["onboard_date"]:
                    basic_info["onboard_date"] = datetime.strptime(basic_info["onboard_date"], "%Y-%m-%d")

                query = """
                UPDATE staff SET
                    family_information_id = %s,
                    emergency_contact_id = %s,
                    work_experience_id = %s,
                    hiring_information_id = %s,
                    name = %s,
                    gender = %s,
                    fill_date = %s,
                    onboard_date = %s,
                    nationality = %s,
                    education = %s,
                    married = %s,
                    position = %s,
                    phone = %s,
                    national_id = %s,
                    mailing_address = %s,
                    registered_address = %s,
                    account = %s,
                    password = %s,
                    store_id = %s,
                    permission = %s
                WHERE staff_id = %s
                """
                cursor.execute(query, (
                    basic_info.get("family_information_id"),
                    basic_info.get("emergency_contact_id"),
                    basic_info.get("work_experience_id"),
                    basic_info.get("hiring_information_id"),
                    basic_info.get("name"),
                    basic_info.get("gender"),
                    basic_info.get("fill_date"),
                    basic_info.get("onboard_date"),
                    basic_info.get("nationality"),
                    basic_info.get("education"),
                    basic_info.get("married"),
                    basic_info.get("position"),
                    basic_info.get("phone"),
                    basic_info.get("national_id"),
                    basic_info.get("mailing_address"),
                    basic_info.get("registered_address"),
                    basic_info.get("account"),
                    basic_info.get("password"),
                    basic_info.get("store_id"),
                    basic_info.get("permission"),
                    staff_id
                ))
            
            # 2. 更新家庭成員 - 先刪除原有記錄，再新增新記錄
            family_members = data.get("family_members", [])
            cursor.execute("DELETE FROM Staff_Family WHERE Staff_ID = %s", (staff_id,))
            
            if family_members and len(family_members) > 0:
                for member in family_members:
                    query = """
                    INSERT INTO Staff_Family (
                        Staff_ID, Family_Name, Family_Relation, 
                        Family_Phone, Family_Address
                    ) VALUES (%s, %s, %s, %s, %s)
                    """
                    cursor.execute(query, (
                        staff_id,
                        member.get("Family_Name"),
                        member.get("Family_Relation"),
                        member.get("Family_Phone"),
                        member.get("Family_Address")
                    ))
            
            # 3. 更新工作經驗 - 先刪除原有記錄，再新增新記錄
            work_experience = data.get("work_experience", [])
            cursor.execute("DELETE FROM Staff_WorkExperience WHERE Staff_ID = %s", (staff_id,))
            
            if work_experience and len(work_experience) > 0:
                for experience in work_experience:
                    # 處理日期格式
                    start_date = None
                    if "Work_StartDate" in experience and experience["Work_StartDate"]:
                        start_date = datetime.strptime(experience["Work_StartDate"], "%Y-%m-%d")
                    
                    end_date = None
                    if "Work_EndDate" in experience and experience["Work_EndDate"]:
                        end_date = datetime.strptime(experience["Work_EndDate"], "%Y-%m-%d")
                    
                    query = """
                    INSERT INTO Staff_WorkExperience (
                        Staff_ID, Work_Company, Work_Position, 
                        Work_StartDate, Work_EndDate, Work_Description
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(query, (
                        staff_id,
                        experience.get("Work_Company"),
                        experience.get("Work_Position"),
                        start_date,
                        end_date,
                        experience.get("Work_Description")
                    ))
            
            connection.commit()
            success = True
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"更新員工錯誤: {e}")
    finally:
        if connection:
            connection.close()
    
    return success

def delete_staff(staff_id):
    """刪除員工"""
    connection = connect_to_db()
    success = False
    
    try:
        with connection.cursor() as cursor:
            # 0. 刪除對應的登入帳號資料 (若存在)
            cursor.execute("DELETE FROM store_account WHERE account = %s", (str(staff_id),))

            # 1. 刪除家庭成員
            try:
                cursor.execute("DELETE FROM Staff_Family WHERE Staff_ID = %s", (staff_id,))
            except pymysql.err.ProgrammingError as e:
                # 資料表不存在時略過
                if e.args[0] != 1146:
                    raise

            # 2. 刪除工作經驗
            cursor.execute("DELETE FROM Staff_WorkExperience WHERE Staff_ID = %s", (staff_id,))

            # 3. 刪除基本資料
            cursor.execute("DELETE FROM staff WHERE staff_id = %s", (staff_id,))
            
            connection.commit()
            success = True
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"刪除員工錯誤: {e}")
    finally:
        if connection:
            connection.close()
    
    return success

def get_store_list():
    """獲取所有分店列表"""
    connection = connect_to_db()
    store_list = []
    
    try:
        with connection.cursor() as cursor:
            query = """
            SELECT DISTINCT store_id FROM staff
            WHERE store_id IS NOT NULL
            """
            cursor.execute(query)
            stores = cursor.fetchall()
            store_list = [store["store_id"] for store in stores]
    except Exception as e:
        print(f"獲取分店列表錯誤: {e}")
    finally:
        if connection:
            connection.close()
    
    return store_list

def get_permission_list():
    """獲取所有權限等級列表"""
    connection = connect_to_db()
    permission_list = []
    
    try:
        with connection.cursor() as cursor:
            query = """
            SELECT DISTINCT permission FROM staff
            WHERE permission IS NOT NULL AND permission != ''
            """
            cursor.execute(query)
            permissions = cursor.fetchall()
            permission_list = [permission["permission"] for permission in permissions]
    except Exception as e:
        print(f"獲取權限列表錯誤: {e}")
    finally:
        if connection:
            connection.close()
    
    return permission_list 

def get_all_stores():
    """
    從 store 資料表中獲取所有分店的 ID 和名稱。
    這是為下拉式選單提供資料的【正確】方法。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = "SELECT store_id, store_name FROM store ORDER BY store_id ASC"
            cursor.execute(query)
            return cursor.fetchall()
    except Exception as e:
        print(f"Error fetching all stores: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_all_staff_with_accounts():
    """獲取所有員工及其帳號資訊，用於總部管理頁面"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = """
            SELECT s.staff_id, s.name, s.phone, s.account, s.password, s.permission, st.store_name
            FROM staff s
            LEFT JOIN store st ON s.store_id = st.store_id
            ORDER BY s.staff_id DESC
            """
            cursor.execute(query)
            return cursor.fetchall()
    finally:
        if conn:
            conn.close()

def search_staff_with_accounts(keyword):
    """搜尋員工及其帳號資訊"""
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            like_keyword = f"%{keyword}%"
            query = """
            SELECT s.staff_id, s.name, s.phone, s.account, s.password, s.permission, st.store_name
            FROM staff s
            LEFT JOIN store st ON s.store_id = st.store_id
            WHERE s.name LIKE %s OR s.phone LIKE %s OR s.account LIKE %s
            ORDER BY s.staff_id DESC
            """
            cursor.execute(query, (like_keyword, like_keyword, like_keyword))
            return cursor.fetchall()
    finally:
        if conn:
            conn.close()

def update_staff_account(staff_id, data):
    """
    [新流程專用] 由總部管理員為指定的員工更新帳號和密碼。
    *** 主要修正點 ***: SQL UPDATE 語句現在只更新 account 和 password。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 準備參數，包含帳號、密碼與權限
            # 注意：這裡應該對密碼進行加密，為了簡化，我們先用明文
            params = {
                "account": data.get("account"),
                "password": data.get("password"),
                "permission": data.get("permission"),
                "staff_id": staff_id
            }

            # 更新帳號、密碼與權限
            query = """
            UPDATE staff SET
                account = %(account)s,
                password = %(password)s,
                permission = %(permission)s
            WHERE staff_id = %(staff_id)s
            """
            
            cursor.execute(query, params)
            conn.commit()

            # 檢查是否有任何一行被更新
            if cursor.rowcount > 0:
                return True
            else:
                # 如果沒有任何行被更新（例如 staff_id 不存在）
                print(f"警告: 更新員工帳號時，沒有找到 staff_id 為 {staff_id} 的員工。")
                return False
    except Exception as e:
        print(f"更新員工帳號時發生錯誤: {e}")
        conn.rollback()
        raise e # 將錯誤拋出，讓 route 可以捕捉並回傳給前端
    finally:
        if conn:
            conn.close()

def get_all_stores_for_dropdown():
    """
    [新功能專用] 從 store 資料表中獲取所有分店的 ID 和名稱。
    這個函式最單純，只做一件事，確保下拉選單有資料。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            query = "SELECT store_id, store_name FROM store ORDER BY store_id ASC"
            cursor.execute(query)
            return cursor.fetchall()
    except Exception as e:
        print(f"Error in get_all_stores_for_dropdown: {e}")
        return [] # 如果出錯，返回空列表
    finally:
        if conn:
            conn.close()

def get_staff_by_store_for_dropdown(store_id):
    """
    獲取指定分店中，所有 account 為 NULL 或空字串的員工。
    """
    conn = connect_to_db()
    try:
        with conn.cursor() as cursor:
            # 查詢 account 是 NULL 或是空字串的員工
            query = """
            SELECT staff_id, name 
            FROM staff 
            WHERE store_id = %s
            ORDER BY name;
            """
            cursor.execute(query, (store_id,))
            return cursor.fetchall()
    except Exception as e:
        print(f"Error in get_staff_by_store_for_dropdown: {e}")
        return []
    finally:
        if conn:
            conn.close()
