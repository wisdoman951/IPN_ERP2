# /app/models/staff_model.py
import pymysql
import os
import numpy as np
from app.config import DB_CONFIG
from datetime import datetime, date


def parse_date(value, field_name):
    """將前端傳入的日期字串轉為 datetime，若為空或格式錯誤則回傳 None 或拋出錯誤"""
    if not value:
        return None
    if isinstance(value, (datetime, date)):
        return value
    value_str = str(value)
    try:
        return datetime.strptime(value_str, "%Y-%m-%d")
    except ValueError:
        try:
            return datetime.strptime(value_str, "%a, %d %b %Y %H:%M:%S %Z")
        except ValueError:
            raise ValueError(f"{field_name} 格式錯誤")

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

def get_staff_by_ids(staff_ids: list[int]):
    """根據 ID 列表取得員工資料"""
    if not staff_ids:
        return []
    connection = connect_to_db()
    try:
        with connection.cursor() as cursor:
            placeholders = ', '.join(['%s'] * len(staff_ids))
            query = f"""
                SELECT staff_id, family_information_id, emergency_contact_id,
                       work_experience_id, hiring_information_id, name, gender,
                       fill_date, onboard_date, nationality, education, married,
                       position, phone, national_id, mailing_address,
                       registered_address, account, password, permission, store_id
                FROM staff
                WHERE staff_id IN ({placeholders})
            """
            cursor.execute(query, tuple(staff_ids))
            return cursor.fetchall()
    except Exception as e:
        print(f"Error in get_staff_by_ids: {e}")
        return []
    finally:
        if connection:
            connection.close()

def get_staff_details(staff_id):
    """獲取員工詳細資料包括家庭成員和工作經驗"""
    connection = connect_to_db()
    result = {
        "basic_info": None,
        "family_information": None,
        "emergency_contact": None,
        "work_experience": None,
        "hiring_information": None
    }

    try:
        with connection.cursor() as cursor:
            # 使用新欄位從 staff 表取得基本資料並格式化日期欄位
            query = (
                """
                SELECT staff_id, family_information_id, emergency_contact_id, work_experience_id,
                       hiring_information_id, name, gender,
                       DATE_FORMAT(fill_date, '%%Y-%%m-%%d') AS fill_date,
                       DATE_FORMAT(onboard_date, '%%Y-%%m-%%d') AS onboard_date,
                       DATE_FORMAT(birthday, '%%Y-%%m-%%d') AS birthday,
                       nationality, education, married, position, phone, national_id,
                       mailing_address, registered_address, account, password, store_id, permission
                FROM staff WHERE staff_id = %s
                """
            )
            cursor.execute(query, (staff_id,))
            result["basic_info"] = cursor.fetchone()
            
            # 取得家庭資料
            if result["basic_info"] and result["basic_info"].get("family_information_id"):
                cursor.execute(
                    "SELECT * FROM family_information WHERE family_information_id = %s",
                    (result["basic_info"]["family_information_id"],)
                )
                result["family_information"] = cursor.fetchone()

            # 取得緊急聯絡人資料
            if result["basic_info"] and result["basic_info"].get("emergency_contact_id"):
                cursor.execute(
                    "SELECT * FROM emergency_contact WHERE emergency_contact_id = %s",
                    (result["basic_info"]["emergency_contact_id"],)
                )
                result["emergency_contact"] = cursor.fetchone()

            # 取得工作經驗資料
            if result["basic_info"] and result["basic_info"].get("work_experience_id"):
                cursor.execute(
                    "SELECT *, DATE_FORMAT(start_date, '%%Y-%%m-%%d') AS start_date, DATE_FORMAT(end_date, '%%Y-%%m-%%d') AS end_date FROM work_experience WHERE work_experience_id = %s",
                    (result["basic_info"]["work_experience_id"],)
                )
                result["work_experience"] = cursor.fetchone()

            # 取得錄用資料
            if result["basic_info"] and result["basic_info"].get("hiring_information_id"):
                cursor.execute(
                    "SELECT *, DATE_FORMAT(official_employment_date, '%%Y-%%m-%%d') AS official_employment_date, DATE_FORMAT(approval_date, '%%Y-%%m-%%d') AS approval_date, DATE_FORMAT(disqualification_date, '%%Y-%%m-%%d') AS disqualification_date FROM hiring_information WHERE hiring_information_id = %s",
                    (result["basic_info"]["hiring_information_id"],)
                )
                result["hiring_information"] = cursor.fetchone()
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
            basic_info = data.get("basic_info", {})
            family_info = data.get("family_information")
            emergency_info = data.get("emergency_contact")
            work_info = data.get("work_experience")
            hiring_info = data.get("hiring_information")

            # 先寫入各個外鍵表格並取得 ID
            family_id = None
            if family_info:
                cursor.execute(
                    "INSERT INTO family_information (name, relationship, age, company, occupation, phone) VALUES (%s, %s, %s, %s, %s, %s)",
                    (
                        family_info.get("name"),
                        family_info.get("relationship"),
                        family_info.get("age"),
                        family_info.get("company"),
                        family_info.get("occupation"),
                        family_info.get("phone"),
                    ),
                )
                family_id = connection.insert_id()

            emergency_id = None
            if emergency_info:
                cursor.execute(
                    "INSERT INTO emergency_contact (name, relationship, age, company, occupation, phone) VALUES (%s, %s, %s, %s, %s, %s)",
                    (
                        emergency_info.get("name"),
                        emergency_info.get("relationship"),
                        emergency_info.get("age"),
                        emergency_info.get("company"),
                        emergency_info.get("occupation"),
                        emergency_info.get("phone"),
                    ),
                )
                emergency_id = connection.insert_id()

            work_id = None
            if work_info:
                start_date = (
                    datetime.strptime(work_info.get("start_date"), "%Y-%m-%d")
                    if work_info.get("start_date")
                    else None
                )
                end_date = (
                    datetime.strptime(work_info.get("end_date"), "%Y-%m-%d")
                    if work_info.get("end_date")
                    else None
                )
                cursor.execute(
                    """
                    INSERT INTO work_experience (
                        start_date, end_date, company_name, department, job_title,
                        supervise_name, department_telephone, salary, is_still_on_work, working_department
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        start_date,
                        end_date,
                        work_info.get("company_name"),
                        work_info.get("department"),
                        work_info.get("job_title"),
                        work_info.get("supervise_name"),
                        work_info.get("department_telephone"),
                        work_info.get("salary"),
                        work_info.get("is_still_on_work"),
                        work_info.get("working_department"),
                    ),
                )
                work_id = connection.insert_id()

            hiring_id = None
            if hiring_info:
                official_date = (
                    datetime.strptime(hiring_info.get("official_employment_date"), "%Y-%m-%d")
                    if hiring_info.get("official_employment_date")
                    else None
                )
                approval_date = (
                    datetime.strptime(hiring_info.get("approval_date"), "%Y-%m-%d")
                    if hiring_info.get("approval_date")
                    else None
                )
                disqualification_date = (
                    datetime.strptime(hiring_info.get("disqualification_date"), "%Y-%m-%d")
                    if hiring_info.get("disqualification_date")
                    else None
                )
                cursor.execute(
                    """
                    INSERT INTO hiring_information (
                        probation_period, duration, salary, official_employment_date,
                        approval_date, disqualification_date, note
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        hiring_info.get("probation_period"),
                        hiring_info.get("duration"),
                        hiring_info.get("salary"),
                        official_date,
                        approval_date,
                        disqualification_date,
                        hiring_info.get("note"),
                    ),
                )
                hiring_id = connection.insert_id()

            # 處理 staff 表日期與 married 值
            try:
                basic_info["fill_date"] = parse_date(basic_info.get("fill_date"), "填表日期")
                basic_info["onboard_date"] = parse_date(basic_info.get("onboard_date"), "入職日期")
                basic_info["birthday"] = parse_date(basic_info.get("birthday"), "出生年月日")
            except ValueError as e:
                raise e

            married = basic_info.get("married")
            if isinstance(married, str):
                married_str = married.strip().lower()
                married = 1 if married_str in ["1", "married", "yes", "true", "已婚"] else 0
            basic_info["married"] = married

            if not basic_info.get("account"):
                basic_info["account"] = None
            if not basic_info.get("password"):
                basic_info["password"] = None
            if basic_info.get("store_id") is None:
                basic_info["store_id"] = None
            if not basic_info.get("permission"):
                basic_info["permission"] = None

            cursor.execute(
                """
                INSERT INTO staff (
                    family_information_id, emergency_contact_id, work_experience_id,
                    hiring_information_id, name, gender, fill_date, onboard_date, birthday,
                    nationality, education, married, position, phone, national_id,
                    mailing_address, registered_address, account, password, store_id,
                    permission
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)

                """,
                (
                    family_id,
                    emergency_id,
                    work_id,
                    hiring_id,
                    basic_info.get("name"),
                    basic_info.get("gender"),
                    basic_info.get("fill_date"),
                    basic_info.get("onboard_date"),
                    basic_info.get("birthday"),
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
                ),
            )

            staff_id = connection.insert_id()

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
            basic_info = data.get("basic_info", {})
            family_info = data.get("family_information")
            emergency_info = data.get("emergency_contact")
            work_info = data.get("work_experience")
            hiring_info = data.get("hiring_information")

            cursor.execute(
                "SELECT account, password, store_id, permission FROM staff WHERE staff_id=%s",
                (staff_id,),
            )
            existing = cursor.fetchone() or {}
            if not basic_info.get("account"):
                basic_info["account"] = existing.get("account")
            if not basic_info.get("password"):
                basic_info["password"] = existing.get("password")
            if basic_info.get("store_id") is None:
                basic_info["store_id"] = existing.get("store_id")
            if not basic_info.get("permission"):
                basic_info["permission"] = existing.get("permission")

            family_id = basic_info.get("family_information_id")
            if family_info:
                if family_id:
                    cursor.execute(
                        "UPDATE family_information SET name=%s, relationship=%s, age=%s, company=%s, occupation=%s, phone=%s WHERE family_information_id=%s",
                        (
                            family_info.get("name"),
                            family_info.get("relationship"),
                            family_info.get("age"),
                            family_info.get("company"),
                            family_info.get("occupation"),
                            family_info.get("phone"),
                            family_id,
                        ),
                    )
                else:
                    cursor.execute(
                        "INSERT INTO family_information (name, relationship, age, company, occupation, phone) VALUES (%s,%s,%s,%s,%s,%s)",
                        (
                            family_info.get("name"),
                            family_info.get("relationship"),
                            family_info.get("age"),
                            family_info.get("company"),
                            family_info.get("occupation"),
                            family_info.get("phone"),
                        ),
                    )
                    family_id = connection.insert_id()

            emergency_id = basic_info.get("emergency_contact_id")
            if emergency_info:
                if emergency_id:
                    cursor.execute(
                        "UPDATE emergency_contact SET name=%s, relationship=%s, age=%s, company=%s, occupation=%s, phone=%s WHERE emergency_contact_id=%s",
                        (
                            emergency_info.get("name"),
                            emergency_info.get("relationship"),
                            emergency_info.get("age"),
                            emergency_info.get("company"),
                            emergency_info.get("occupation"),
                            emergency_info.get("phone"),
                            emergency_id,
                        ),
                    )
                else:
                    cursor.execute(
                        "INSERT INTO emergency_contact (name, relationship, age, company, occupation, phone) VALUES (%s,%s,%s,%s,%s,%s)",
                        (
                            emergency_info.get("name"),
                            emergency_info.get("relationship"),
                            emergency_info.get("age"),
                            emergency_info.get("company"),
                            emergency_info.get("occupation"),
                            emergency_info.get("phone"),
                        ),
                    )
                    emergency_id = connection.insert_id()

            work_id = basic_info.get("work_experience_id")
            if work_info:
                start_date = (
                    datetime.strptime(work_info.get("start_date"), "%Y-%m-%d")
                    if work_info.get("start_date")
                    else None
                )
                end_date = (
                    datetime.strptime(work_info.get("end_date"), "%Y-%m-%d")
                    if work_info.get("end_date")
                    else None
                )
                if work_id:
                    cursor.execute(
                        """
                        UPDATE work_experience SET start_date=%s, end_date=%s, company_name=%s, department=%s, job_title=%s,
                            supervise_name=%s, department_telephone=%s, salary=%s, is_still_on_work=%s, working_department=%s
                        WHERE work_experience_id=%s
                        """,
                        (
                            start_date,
                            end_date,
                            work_info.get("company_name"),
                            work_info.get("department"),
                            work_info.get("job_title"),
                            work_info.get("supervise_name"),
                            work_info.get("department_telephone"),
                            work_info.get("salary"),
                            work_info.get("is_still_on_work"),
                            work_info.get("working_department"),
                            work_id,
                        ),
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO work_experience (
                            start_date, end_date, company_name, department, job_title,
                            supervise_name, department_telephone, salary, is_still_on_work, working_department
                        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        (
                            start_date,
                            end_date,
                            work_info.get("company_name"),
                            work_info.get("department"),
                            work_info.get("job_title"),
                            work_info.get("supervise_name"),
                            work_info.get("department_telephone"),
                            work_info.get("salary"),
                            work_info.get("is_still_on_work"),
                            work_info.get("working_department"),
                        ),
                    )
                    work_id = connection.insert_id()

            hiring_id = basic_info.get("hiring_information_id")
            if hiring_info:
                official_date = (
                    datetime.strptime(hiring_info.get("official_employment_date"), "%Y-%m-%d")
                    if hiring_info.get("official_employment_date")
                    else None
                )
                approval_date = (
                    datetime.strptime(hiring_info.get("approval_date"), "%Y-%m-%d")
                    if hiring_info.get("approval_date")
                    else None
                )
                disqualification_date = (
                    datetime.strptime(hiring_info.get("disqualification_date"), "%Y-%m-%d")
                    if hiring_info.get("disqualification_date")
                    else None
                )
                if hiring_id:
                    cursor.execute(
                        """
                        UPDATE hiring_information SET probation_period=%s, duration=%s, salary=%s, official_employment_date=%s,
                            approval_date=%s, disqualification_date=%s, note=%s WHERE hiring_information_id=%s
                        """,
                        (
                            hiring_info.get("probation_period"),
                            hiring_info.get("duration"),
                            hiring_info.get("salary"),
                            official_date,
                            approval_date,
                            disqualification_date,
                            hiring_info.get("note"),
                            hiring_id,
                        ),
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO hiring_information (
                            probation_period, duration, salary, official_employment_date,
                            approval_date, disqualification_date, note
                        ) VALUES (%s,%s,%s,%s,%s,%s,%s)
                        """,
                        (
                            hiring_info.get("probation_period"),
                            hiring_info.get("duration"),
                            hiring_info.get("salary"),
                            official_date,
                            approval_date,
                            disqualification_date,
                            hiring_info.get("note"),
                        ),
                    )
                    hiring_id = connection.insert_id()

            try:
                basic_info["fill_date"] = parse_date(basic_info.get("fill_date"), "填表日期")
                basic_info["onboard_date"] = parse_date(basic_info.get("onboard_date"), "入職日期")
                basic_info["birthday"] = parse_date(basic_info.get("birthday"), "出生年月日")
            except ValueError as e:
                raise e

            married = basic_info.get("married")
            if isinstance(married, str):
                married_str = married.strip().lower()
                married = 1 if married_str in ["1", "married", "yes", "true", "已婚"] else 0
            basic_info["married"] = married

            cursor.execute(
                """
                UPDATE staff SET
                    family_information_id=%s,
                    emergency_contact_id=%s,
                    work_experience_id=%s,
                    hiring_information_id=%s,
                    name=%s,
                    gender=%s,
                    fill_date=%s,
                    onboard_date=%s,
                    birthday=%s,
                    nationality=%s,
                    education=%s,
                    married=%s,
                    position=%s,
                    phone=%s,
                    national_id=%s,
                    mailing_address=%s,
                    registered_address=%s,
                    account=%s,
                    password=%s,
                    store_id=%s,
                    permission=%s
                WHERE staff_id=%s
                """,
                (
                    family_id,
                    emergency_id,
                    work_id,
                    hiring_id,
                    basic_info.get("name"),
                    basic_info.get("gender"),
                    basic_info.get("fill_date"),
                    basic_info.get("onboard_date"),
                    basic_info.get("birthday"),
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
                    staff_id,
                ),
            )

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

            # 1. 取得外鍵 ID
            cursor.execute(
                "SELECT family_information_id, emergency_contact_id, work_experience_id, hiring_information_id FROM staff WHERE staff_id = %s",
                (staff_id,),
            )
            fk_ids = cursor.fetchone()

            # 2. 刪除基本資料
            cursor.execute("DELETE FROM staff WHERE staff_id = %s", (staff_id,))

            # 3. 刪除相關表格資料
            if fk_ids:
                if fk_ids.get("family_information_id"):
                    cursor.execute(
                        "DELETE FROM family_information WHERE family_information_id = %s",
                        (fk_ids["family_information_id"],),
                    )
                if fk_ids.get("emergency_contact_id"):
                    cursor.execute(
                        "DELETE FROM emergency_contact WHERE emergency_contact_id = %s",
                        (fk_ids["emergency_contact_id"],),
                    )
                if fk_ids.get("work_experience_id"):
                    cursor.execute(
                        "DELETE FROM work_experience WHERE work_experience_id = %s",
                        (fk_ids["work_experience_id"],),
                    )
                if fk_ids.get("hiring_information_id"):
                    cursor.execute(
                        "DELETE FROM hiring_information WHERE hiring_information_id = %s",
                        (fk_ids["hiring_information_id"],),
                    )
            
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
            SELECT s.staff_id, s.name, s.phone, s.account, s.password, s.permission, s.reset_requested, st.store_name
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
            SELECT s.staff_id, s.name, s.phone, s.account, s.password, s.permission, s.reset_requested, st.store_name
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
                permission = %(permission)s,
                reset_requested = 0
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
