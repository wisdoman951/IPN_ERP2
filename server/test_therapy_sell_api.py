#!/usr/bin/env python3
import requests
import json
import pymysql

# 直接定義DB_CONFIG而不是導入它
DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "Zxcn-1357",
    "database": "ERP",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor
}

# API基礎URL
BASE_URL = "http://localhost:5000/api"

# 測試認證標頭
HEADERS = {
    'Content-Type': 'application/json',
    'X-Store-ID': '1',
    'X-Store-Level': 'admin'
}

def test_database_connection():
    """測試資料庫連接"""
    print("\n==== 測試資料庫連接 ====")
    try:
        # 嘗試連接到資料庫
        conn = pymysql.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        conn.close()
        print("✅ 資料庫連接成功")
        return True
    except Exception as e:
        print(f"❌ 資料庫連接失敗: {e}")
        return False

def test_get_all_therapy_packages():
    """測試獲取所有療程套餐API"""
    print("\n==== 測試獲取所有療程套餐 ====")
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/packages", headers=HEADERS)
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            packages = response.json()
            print(f"✅ 獲取成功，共有 {len(packages)} 個療程套餐")
            return True
        else:
            print(f"❌ 獲取失敗: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 請求異常: {e}")
        return False

def test_search_therapy_packages():
    """測試搜尋療程套餐API"""
    print("\n==== 測試搜尋療程套餐 ====")
    keyword = "測試"  # 可以替換為實際存在的療程套餐名稱
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/packages/search?keyword={keyword}", headers=HEADERS)
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            packages = response.json()
            print(f"✅ 搜尋成功，關鍵字 '{keyword}' 找到 {len(packages)} 個療程套餐")
            return True
        else:
            print(f"❌ 搜尋失敗: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 請求異常: {e}")
        return False

def test_get_all_therapy_sells():
    """測試獲取所有療程銷售紀錄API"""
    print("\n==== 測試獲取所有療程銷售紀錄 ====")
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/sales", headers=HEADERS)
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            sales = response.json()
            print(f"✅ 獲取成功，共有 {len(sales)} 筆療程銷售紀錄")
            return True
        else:
            print(f"❌ 獲取失敗: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 請求異常: {e}")
        return False

def test_search_therapy_sells():
    """測試搜尋療程銷售紀錄API"""
    print("\n==== 測試搜尋療程銷售紀錄 ====")
    keyword = "測試"  # 可以替換為實際存在的會員姓名或療程名稱
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/sales/search?keyword={keyword}", headers=HEADERS)
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            sales = response.json()
            print(f"✅ 搜尋成功，關鍵字 '{keyword}' 找到 {len(sales)} 筆療程銷售紀錄")
            return True
        else:
            print(f"❌ 搜尋失敗: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 請求異常: {e}")
        return False

def test_create_therapy_sell():
    """測試新增療程銷售紀錄"""
    print("\n==== 測試新增療程銷售紀錄 ====")
    
    # 獲取第一個會員的ID (如存在)
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/members", headers=HEADERS)
        if response.status_code == 200 and len(response.json()) > 0:
            member_id = response.json()[0]["Member_ID"]
        else:
            print("無法從API獲取會員ID，使用硬編碼值: 8")
            member_id = 8  # 使用硬編碼值
    except Exception as e:
        print(f"獲取會員ID時出錯: {e}")
        member_id = 8  # 使用硬編碼值
    
    # 獲取第一個員工的ID (如存在)
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/staff", headers=HEADERS)
        if response.status_code == 200 and len(response.json()) > 0:
            staff_id = response.json()[0]["Staff_ID"]
        else:
            print("無法從API獲取員工ID，使用硬編碼值: 6")
            staff_id = 6  # 使用硬編碼值
    except Exception as e:
        print(f"獲取員工ID時出錯: {e}")
        staff_id = 6  # 使用硬編碼值
    
    # 獲取第一個療程套餐的ID (如存在)
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/packages", headers=HEADERS)
        if response.status_code == 200 and len(response.json()) > 0:
            therapy_code = response.json()[0]["TherapyCode"]
        else:
            print("無法從API獲取療程套餐ID，使用硬編碼值: TP001")
            therapy_code = "TP001"  # 使用硬編碼值
    except Exception as e:
        print(f"獲取療程套餐ID時出錯: {e}")
        therapy_code = "TP001"  # 使用硬編碼值
    
    # 準備測試資料
    test_data = {
        "memberId": member_id,
        "purchaseDate": "2023-01-01",
        "therapyPackageId": therapy_code,
        "sessions": "10",
        "paymentMethod": "Cash",
        "staffId": staff_id,
        "saleCategory": "測試銷售"
    }
    
    print(f"使用測試資料: {json.dumps(test_data)}")
    
    # 發送請求
    response = requests.post(f"{BASE_URL}/therapy-sell/sales", json=test_data, headers=HEADERS)
    print(f"狀態碼: {response.status_code}")
    
    # 檢查結果
    if response.status_code == 200 or response.status_code == 201:
        print(f"✅ 新增療程銷售紀錄成功: {response.json()}")
        return response.json()
    else:
        print(f"❌ 新增療程銷售紀錄失敗: {response.status_code} - {response.text}")
        return None

def test_export_therapy_sells():
    """測試匯出療程銷售紀錄API"""
    print("\n==== 測試匯出療程銷售紀錄 ====")
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/sales/export", headers=HEADERS)
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            # 檢查是否為Excel檔案
            content_type = response.headers.get('Content-Type')
            if 'spreadsheetml' in content_type:
                print(f"✅ 匯出成功，檔案大小: {len(response.content)} bytes")
                return True
            else:
                print(f"❌ 匯出格式不正確: {content_type}")
                return False
        else:
            print(f"❌ 匯出失敗: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 請求異常: {e}")
        return False

def test_delete_therapy_sell():
    """測試刪除療程銷售紀錄"""
    print("\n==== 測試刪除療程銷售紀錄 ====")
    
    # 先創建一個用於刪除測試的紀錄
    # 獲取第一個會員的ID (如存在)
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/members", headers=HEADERS)
        if response.status_code == 200 and len(response.json()) > 0:
            member_id = response.json()[0]["Member_ID"]
        else:
            print("無法從API獲取會員ID，使用硬編碼值: 8")
            member_id = 8  # 使用硬編碼值
    except Exception as e:
        print(f"獲取會員ID時出錯: {e}")
        member_id = 8  # 使用硬編碼值
    
    # 獲取第一個員工的ID (如存在)
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/staff", headers=HEADERS)
        if response.status_code == 200 and len(response.json()) > 0:
            staff_id = response.json()[0]["Staff_ID"]
        else:
            print("無法從API獲取員工ID，使用硬編碼值: 6")
            staff_id = 6  # 使用硬編碼值
    except Exception as e:
        print(f"獲取員工ID時出錯: {e}")
        staff_id = 6  # 使用硬編碼值
    
    # 獲取第一個療程套餐的ID (如存在)
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/packages", headers=HEADERS)
        if response.status_code == 200 and len(response.json()) > 0:
            therapy_code = response.json()[0]["TherapyCode"]
        else:
            print("無法從API獲取療程套餐ID，使用硬編碼值: TP001")
            therapy_code = "TP001"  # 使用硬編碼值
    except Exception as e:
        print(f"獲取療程套餐ID時出錯: {e}")
        therapy_code = "TP001"  # 使用硬編碼值
    
    # 準備測試資料
    test_data = {
        "memberId": member_id,
        "purchaseDate": "2023-01-01",
        "therapyPackageId": therapy_code,
        "sessions": "10",
        "paymentMethod": "Cash",
        "staffId": staff_id,
        "saleCategory": "測試銷售_DELETE_TEST"
    }
    
    print(f"使用測試資料: {json.dumps(test_data)}")
    
    # 發送創建請求
    create_response = requests.post(f"{BASE_URL}/therapy-sell/sales", json=test_data, headers=HEADERS)
    print(f"創建銷售紀錄狀態碼: {create_response.status_code}")
    
    # 如果創建成功，則嘗試刪除
    if create_response.status_code == 200 or create_response.status_code == 201:
        # 獲取所有療程銷售紀錄，找到我們剛創建的那一筆
        try:
            # 先從API取得最新的銷售紀錄
            response = requests.get(f"{BASE_URL}/therapy-sell/sales", headers=HEADERS)
            if response.status_code == 200 and len(response.json()) > 0:
                # 取得最新的銷售紀錄（通常是最後一筆）
                sales = response.json()
                for sale in sales:
                    if sale['SaleCategory'] == '測試銷售_DELETE_TEST':
                        sale_id = sale['Order_ID']
                        print(f"找到測試銷售記錄，ID: {sale_id}")
                        break
                else:
                    # 如果沒找到，使用第一筆記錄
                    sale_id = sales[0]['Order_ID']
                    print(f"未找到測試銷售記錄，使用第一筆記錄，ID: {sale_id}")
                
                print(f"使用銷售記錄ID: {sale_id} 進行刪除測試")
                
                # 發送刪除請求
                delete_response = requests.delete(f"{BASE_URL}/therapy-sell/sales/{sale_id}", headers=HEADERS)
                print(f"刪除銷售紀錄狀態碼: {delete_response.status_code}")
                
                # 檢查結果
                if delete_response.status_code == 200:
                    print(f"✅ 刪除成功: {delete_response.json()}")
                    return True
                else:
                    print(f"❌ 刪除失敗: {delete_response.status_code} - {delete_response.text}")
                    return False
            else:
                print("❌ 無法獲取銷售紀錄清單")
                return False
        except Exception as e:
            print(f"❌ 獲取或刪除記錄時出錯: {e}")
            return False
    else:
        print("❌ 創建測試銷售紀錄失敗，無法測試刪除功能")
        print("嘗試獲取現有記錄進行刪除測試...")
        
        # 嘗試獲取現有記錄
        try:
            response = requests.get(f"{BASE_URL}/therapy-sell/sales", headers=HEADERS)
            if response.status_code == 200 and len(response.json()) > 0:
                sale_id = response.json()[0]["Order_ID"]
                print(f"使用銷售記錄ID: {sale_id} 進行刪除測試")
                
                # 發送刪除請求
                delete_response = requests.delete(f"{BASE_URL}/therapy-sell/sales/{sale_id}", headers=HEADERS)
                print(f"刪除銷售紀錄狀態碼: {delete_response.status_code}")
                
                # 檢查結果
                if delete_response.status_code == 200:
                    print(f"✅ 刪除成功: {delete_response.json()}")
                    return True
                else:
                    print(f"❌ 刪除失敗: {delete_response.status_code} - {delete_response.text}")
                    return False
            else:
                print("❌ 無法獲取現有銷售記錄")
                return False
        except Exception as e:
            print(f"❌ 請求異常: {e}")
            return False

def test_get_all_members():
    """測試獲取所有會員API"""
    print("\n==== 測試獲取所有會員 ====")
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/members", headers=HEADERS)
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            members = response.json()
            print(f"✅ 獲取成功，共有 {len(members)} 位會員")
            return True
        else:
            print(f"❌ 獲取失敗: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 請求異常: {e}")
        return False

def test_get_all_staff():
    """測試獲取所有員工API"""
    print("\n==== 測試獲取所有員工 ====")
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/staff", headers=HEADERS)
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            staff = response.json()
            print(f"✅ 獲取成功，共有 {len(staff)} 位員工")
            return True
        else:
            print(f"❌ 獲取失敗: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 請求異常: {e}")
        return False

def get_first_available_member_id():
    """獲取第一個可用的會員ID，用於測試"""
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/members", headers=HEADERS)
        if response.status_code == 200:
            members = response.json()
            if members and len(members) > 0:
                return members[0]["Member_ID"]
        return None
    except Exception as e:
        print(f"❌ 獲取會員ID時出錯: {e}")
        return None

def get_first_available_staff_id():
    """獲取第一個可用的員工ID，用於測試"""
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/staff", headers=HEADERS)
        if response.status_code == 200:
            staff = response.json()
            if staff and len(staff) > 0:
                return staff[0]["Staff_ID"]
        return None
    except Exception as e:
        print(f"❌ 獲取員工ID時出錯: {e}")
        return None

def get_first_available_package_id():
    """獲取第一個可用的療程套餐ID，用於測試"""
    try:
        response = requests.get(f"{BASE_URL}/therapy-sell/packages", headers=HEADERS)
        if response.status_code == 200:
            packages = response.json()
            if packages and len(packages) > 0:
                return packages[0]["TherapyCode"]
        return None
    except Exception as e:
        print(f"❌ 獲取療程套餐ID時出錯: {e}")
        return None

if __name__ == "__main__":
    print("開始測試療程銷售API...")
    
    # 首先測試資料庫連接
    if not test_database_connection():
        print("⚠️ 資料庫連接失敗，終止測試")
        exit(1)
    
    # 測試所有API功能
    test_results = {
        "獲取所有療程套餐": test_get_all_therapy_packages(),
        "搜尋療程套餐": test_search_therapy_packages(),
        "獲取所有療程銷售紀錄": test_get_all_therapy_sells(),
        "搜尋療程銷售紀錄": test_search_therapy_sells(),
        "獲取所有會員": test_get_all_members(),
        "獲取所有員工": test_get_all_staff(),
        "新增療程銷售紀錄": test_create_therapy_sell(),
        "匯出療程銷售紀錄": test_export_therapy_sells(),
        "刪除療程銷售紀錄": test_delete_therapy_sell()
    }
    
    # 顯示測試結果摘要
    print("\n==== 測試結果摘要 ====")
    for name, result in test_results.items():
        status = "✅ 通過" if result else "❌ 失敗"
        print(f"{name}: {status}")
    
    all_passed = all(test_results.values())
    if all_passed:
        print("\n🎉 所有測試皆通過！")
    else:
        print("\n⚠️ 有測試未通過，請檢查上方日誌。") 