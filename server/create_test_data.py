#!/usr/bin/env python3
import pymysql
from app.config import DB_CONFIG

def connect_to_db():
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

def create_test_permission():
    """創建測試權限"""
    conn = connect_to_db()
    
    try:
        with conn.cursor() as cursor:
            # 檢查測試權限是否已存在
            cursor.execute("SELECT * FROM permission WHERE Permission_id = 999")
            if cursor.fetchone():
                print("測試權限 (ID: 999) 已存在")
                return
            
            # 創建測試權限
            cursor.execute("""
                INSERT INTO permission (
                    Permission_id, staff_level, store_level
                ) VALUES (999, '治療師', '分店')
            """)
            conn.commit()
            print("✅ 測試權限創建成功")
    except Exception as e:
        print(f"❌ 創建測試權限失敗: {e}")
    finally:
        conn.close()

def create_test_store():
    """創建測試商店"""
    conn = connect_to_db()
    
    try:
        with conn.cursor() as cursor:
            # 檢查測試商店是否已存在
            cursor.execute("SELECT * FROM store WHERE Store_ID = 999")
            if cursor.fetchone():
                print("測試商店 (ID: 999) 已存在")
                return
            
            # 創建測試商店
            cursor.execute("""
                INSERT INTO store (
                    Store_ID, Store_Name, Store_Level, Store_Account, Store_Password
                ) VALUES (999, '測試商店', '分店', 'test_store', 'test_password')
            """)
            conn.commit()
            print("✅ 測試商店創建成功")
    except Exception as e:
        print(f"❌ 創建測試商店失敗: {e}")
    finally:
        conn.close()

def create_test_member():
    """創建測試會員"""
    conn = connect_to_db()
    
    try:
        with conn.cursor() as cursor:
            # 檢查測試會員是否已存在
            cursor.execute("SELECT * FROM member WHERE Member_ID = 999")
            if cursor.fetchone():
                print("測試會員 (ID: 999) 已存在")
                return
            
            # 創建測試會員
            cursor.execute("""
                INSERT INTO member (
                    Member_ID, Name, Birthday, Address, Phone, Gender,
                    BloodType, LineID, AllergyNotes, SpecialRequests, PreferredTherapist
                ) VALUES (999, '測試會員', '1990-01-01', '測試地址', '0912345678', 'Male',
                         'A', 'test_line_id', '無過敏', '無特殊要求', '測試治療師')
            """)
            conn.commit()
            print("✅ 測試會員創建成功")
    except Exception as e:
        print(f"❌ 創建測試會員失敗: {e}")
    finally:
        conn.close()

def create_test_staff():
    """創建測試員工/治療師"""
    conn = connect_to_db()
    
    try:
        with conn.cursor() as cursor:
            # 檢查測試員工是否已存在
            cursor.execute("SELECT * FROM staff WHERE Staff_ID = 999")
            if cursor.fetchone():
                print("測試員工 (ID: 999) 已存在")
                return
            
            # 創建測試員工
            cursor.execute("""
                INSERT INTO staff (
                    Staff_ID, Name, Phone, Permission_id, Store_ID
                ) VALUES (999, '測試治療師', '0923456789', 999, 999)
            """)
            conn.commit()
            print("✅ 測試員工創建成功")
    except Exception as e:
        print(f"❌ 創建測試員工失敗: {e}")
    finally:
        conn.close()

def create_test_product():
    """創建測試產品"""
    conn = connect_to_db()
    
    try:
        with conn.cursor() as cursor:
            # 檢查測試產品是否已存在
            cursor.execute("SELECT * FROM product WHERE Product_ID = 999")
            if cursor.fetchone():
                print("測試產品 (ID: 999) 已存在")
                return
            
            # 創建測試產品
            cursor.execute("""
                INSERT INTO product (
                    Product_ID, ProductName, ProductCode, ProductPrice, ProductCategory
                ) VALUES (999, '測試產品', 'TEST001', 1000.00, '測試類別')
            """)
            conn.commit()
            print("✅ 測試產品創建成功")
    except Exception as e:
        print(f"❌ 創建測試產品失敗: {e}")
    finally:
        conn.close()

def create_test_therapy_package():
    """創建測試療程套裝"""
    conn = connect_to_db()
    
    try:
        with conn.cursor() as cursor:
            # 檢查測試療程套裝是否已存在
            cursor.execute("SELECT * FROM therapypackage WHERE Therapy_ID = 999")
            if cursor.fetchone():
                print("測試療程套裝 (ID: 999) 已存在")
                return
            
            # 創建測試療程套裝
            cursor.execute("""
                INSERT INTO therapypackage (
                    Therapy_ID, TherapySessions, TherapyContent, TherapyCategory
                ) VALUES (999, 10, '測試療程內容', '測試類別')
            """)
            conn.commit()
            print("✅ 測試療程套裝創建成功")
    except Exception as e:
        print(f"❌ 創建測試療程套裝失敗: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("開始創建測試數據...")
    create_test_permission()  # 首先創建權限
    create_test_store()       # 然後創建商店
    create_test_member()
    create_test_staff()       # 員工依賴於權限和商店
    create_test_product()
    create_test_therapy_package()
    print("測試數據創建完成！") 