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
BASE_URL = "http://localhost:5000/api/stress-test"

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

def test_get_stress_tests():
    """測試獲取壓力測試結果"""
    response = requests.get(BASE_URL, headers=HEADERS)
    
    print(f"獲取壓力測試結果狀態碼: {response.status_code}")
    print(f"回應內容: {response.text[:200]}..." if len(response.text) > 200 else f"回應內容: {response.text}")
    
    if response.status_code == 200:
        print("獲取壓力測試結果測試通過")
        return True
    else:
        print("獲取壓力測試結果測試失敗")
        return False

def test_search_stress_tests():
    """測試搜尋壓力測試結果"""
    search_params = {
        "name": "測試"
    }
    response = requests.get(f"{BASE_URL}/search", params=search_params, headers=HEADERS)
    
    print(f"搜尋壓力測試結果狀態碼: {response.status_code}")
    print(f"回應內容: {response.text[:200]}..." if len(response.text) > 200 else f"回應內容: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        results = data.get('data', [])
        print(f"搜尋成功，找到 {len(results)} 筆壓力測試記錄")
        return True
    else:
        print("搜尋壓力測試結果測試失敗")
        return False

def test_add_stress_test():
    """測試添加壓力測試結果"""
    # 取得測試用的會員ID
    member_id = get_first_available_member_id()
    if not member_id:
        print(f"無法獲取有效的會員ID，測試失敗")
        return False
        
    # 直接使用分數的測試數據
    score_test_data = {
        "member_id": member_id,
        "score": 75
    }
    
    # 使用答案計算分數的測試數據
    answers_test_data = {
        "member_id": member_id,
        "answers": {
            "q1": "A",
            "q2": "B",
            "q3": "C",
            "q4": "D",
            "q5": "A"
        }
    }
    
    # 測試直接使用分數的情況
    score_response = requests.post(BASE_URL, headers=HEADERS, json=score_test_data)
    print(f"使用分數添加壓力測試結果狀態碼: {score_response.status_code}")
    print(f"回應內容: {score_response.text}")
    
    # 測試使用答案計算分數的情況
    answers_response = requests.post(BASE_URL, headers=HEADERS, json=answers_test_data)
    print(f"使用答案添加壓力測試結果狀態碼: {answers_response.status_code}")
    print(f"回應內容: {answers_response.text}")
    
    # 如果任一測試成功，則視為通過
    if score_response.status_code == 200 or answers_response.status_code == 200:
        print("添加壓力測試結果測試通過")
        return True
    else:
        print("添加壓力測試結果測試失敗")
        return False

def test_delete_stress_test():
    """測試刪除壓力測試結果"""
    # 首先獲取所有壓力測試結果
    response = requests.get(BASE_URL, headers=HEADERS)
    
    if response.status_code != 200:
        print("獲取壓力測試結果失敗")
        return False
    
    try:
        data = response.json()
        tests = data.get("data", [])
        
        if not tests:
            print("沒有可刪除的壓力測試結果")
            return False
        
        # 刪除第一個測試結果
        test_id = tests[0].get("Analysis_ID")
        if not test_id:
            print("無法找到測試ID")
            return False
        
        delete_response = requests.delete(f"{BASE_URL}/{test_id}", headers=HEADERS)
        
        print(f"刪除壓力測試結果狀態碼: {delete_response.status_code}")
        print(f"回應內容: {delete_response.text}")
        
        if delete_response.status_code == 200:
            print("刪除壓力測試結果測試通過")
            return True
        else:
            print("刪除壓力測試結果測試失敗")
            return False
    
    except Exception as e:
        print(f"測試刪除壓力測試結果時發生錯誤: {e}")
        return False

def get_first_available_member_id():
    """獲取第一個有效的會員ID，用於測試"""
    # 從療程銷售的會員API獲取
    try:
        response = requests.get("http://localhost:5001/api/therapy-sell/members", headers=HEADERS)
        if response.status_code == 200:
            members = response.json()
            if members and len(members) > 0:
                return members[0].get('Member_ID')
    except Exception as e:
        print(f"獲取會員信息失敗: {e}")
    
    # 如果上面的方法失敗，嘗試另一個API路徑
    try:
        response = requests.get("http://localhost:5001/api/member/list", headers=HEADERS)
        if response.status_code == 200:
            members = response.json()
            if members and len(members) > 0:
                return members[0].get('Member_ID')
    except Exception as e:
        print(f"獲取會員信息失敗: {e}")
    
    return None

def get_member_name(member_id):
    """根據會員ID獲取會員姓名，用於測試驗證"""
    try:
        response = requests.get("http://localhost:5001/api/therapy-sell/members", headers=HEADERS)
        if response.status_code == 200:
            members = response.json()
            for member in members:
                if member.get('Member_ID') == member_id:
                    return member.get('Name')
    except Exception:
        pass
    return None

if __name__ == "__main__":
    print("開始測試壓力測試API...")
    
    # 首先測試資料庫連接
    if not test_database_connection():
        print("⚠️ 資料庫連接失敗，終止測試")
        exit(1)
    
    # 測試所有API功能
    test_results = {
        "獲取壓力測試結果": test_get_stress_tests(),
        "搜尋壓力測試結果": test_search_stress_tests(),
        "添加壓力測試結果": test_add_stress_test(),
        "刪除壓力測試結果": test_delete_stress_test()
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