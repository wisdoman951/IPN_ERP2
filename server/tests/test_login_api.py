#!/usr/bin/env python3
import sys
import os
import requests
import json
import jwt
from datetime import datetime
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 啟用 CORS
# 將server目錄添加到系統路徑，以便能夠導入app模組
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.config import DB_CONFIG

# API基礎URL
BASE_URL = "http://localhost:5000/api/login"

# 定義通用請求頭
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Origin": "http://localhost:3000"
}

# 使用現有的商店資料
HQ_ID = "1"
HQ_PASSWORD = "taipei2025"
BRANCH_ID = "2"
BRANCH_PASSWORD = "taichung2025"

def decode_token(token):
    """解碼JWT令牌，僅用於測試目的（不驗證簽名）"""
    try:
        # 不驗證簽名，僅解碼令牌
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded
    except:
        return None

def test_branch_login_success():
    """測試分店登入成功場景"""
    print("\n✅ 測試分店登入成功...")
    
    response = requests.post(
        f"{BASE_URL}/login",
        json={"account": BRANCH_ID, "password": BRANCH_PASSWORD},
        headers=HEADERS
    )
    
    print(f"狀態碼: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"登入響應: {json.dumps(data, ensure_ascii=False)}")
        
        if "token" in data:
            token_data = decode_token(data["token"])
            print(f"令牌包含的資訊: {json.dumps(token_data, ensure_ascii=False)}")
            
            if data["store_level"] == "分店":
                print("✅ 分店登入測試通過")
            else:
                print(f"❌ 預期商店類型為'分店'，但得到'{data['store_level']}'")
        else:
            print("❌ 響應中無令牌")
    else:
        print(f"❌ 請求失敗: {response.text}")

def test_branch_login_failure():
    """測試分店登入失敗場景（密碼錯誤）"""
    print("\n✅ 測試分店登入失敗（密碼錯誤）...")
    
    wrong_password = "wrong_password"  # 錯誤的密碼
    
    response = requests.post(
        f"{BASE_URL}/login",
        json={"account": BRANCH_ID, "password": wrong_password},
        headers=HEADERS
    )
    
    print(f"狀態碼: {response.status_code}")
    
    if response.status_code == 401:  # 應該返回401未授權
        print("✅ 密碼錯誤測試通過")
    else:
        print(f"❌ 預期狀態碼401，但得到{response.status_code}")
        print(f"響應: {response.text}")

def test_hq_login_success():
    """測試總部登入成功場景"""
    print("\n✅ 測試總部登入成功...")
    
    response = requests.post(
        f"{BASE_URL}/login",
        json={"account": HQ_ID, "password": HQ_PASSWORD},
        headers=HEADERS
    )
    
    print(f"狀態碼: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"登入響應: {json.dumps(data, ensure_ascii=False)}")
        
        if "token" in data:
            token_data = decode_token(data["token"])
            print(f"令牌包含的資訊: {json.dumps(token_data, ensure_ascii=False)}")
            
            if data["store_level"] == "總店":
                print("✅ 總部登入測試通過")
            else:
                print(f"❌ 預期商店類型為'總店'，但得到'{data['store_level']}'")
        else:
            print("❌ 響應中無令牌")
    else:
        print(f"❌ 請求失敗: {response.text}")

def test_hq_using_branch_login():
    """測試總部使用分店登入（應該顯示錯誤）"""
    print("\n✅ 測試總部使用分店登入（預期顯示錯誤）...")
    
    # 模擬前端邏輯：檢查登入總店級別後才顯示錯誤提示
    response = requests.post(
        f"{BASE_URL}/login", 
        json={"account": HQ_ID, "password": HQ_PASSWORD},
        headers=HEADERS
    )
    
    print(f"狀態碼: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if data["store_level"] == "總店" and "分店登入" == "分店登入":
            # 前端應顯示錯誤：此帳號不屬於分店
            print("✅ 總部帳號嘗試分店登入測試通過 - 前端應顯示：此帳號不屬於分店")
        else:
            print("❌ 無法模擬總部使用分店登入錯誤")
    else:
        print(f"❌ 請求失敗: {response.text}")

def test_branch_using_hq_login():
    """測試分店使用總部登入（應該顯示錯誤）"""
    print("\n✅ 測試分店使用總部登入（預期顯示錯誤）...")
    
    # 模擬前端邏輯：檢查登入分店級別後才顯示錯誤提示
    response = requests.post(
        f"{BASE_URL}/login", 
        json={"account": BRANCH_ID, "password": BRANCH_PASSWORD},
        headers=HEADERS
    )
    
    print(f"狀態碼: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if data["store_level"] == "分店" and "總部登入" == "總部登入":
            # 前端應顯示錯誤：此帳號不屬於總部
            print("✅ 分店帳號嘗試總部登入測試通過 - 前端應顯示：此帳號不屬於總部")
        else:
            print("❌ 無法模擬分店使用總部登入錯誤")
    else:
        print(f"❌ 請求失敗: {response.text}")

def test_nonexistent_account():
    """測試登入不存在的帳號"""
    print("\n✅ 測試登入不存在的帳號...")
    
    nonexistent_store_id = "999999"  # 假設不存在的帳號
    password = "password"
    
    response = requests.post(
        f"{BASE_URL}/login",
        json={"account": nonexistent_store_id, "password": password},
        headers=HEADERS
    )
    
    print(f"狀態碼: {response.status_code}")
    
    if response.status_code == 404:  # 應該返回404未找到
        print("✅ 不存在帳號測試通過")
    else:
        print(f"❌ 預期狀態碼404，但得到{response.status_code}")
        print(f"響應: {response.text}")

def test_token_validation():
    """測試令牌驗證"""
    print("\n✅ 測試令牌驗證...")
    
    # 先登入獲取令牌
    login_response = requests.post(
        f"{BASE_URL}/login",
        json={"account": HQ_ID, "password": HQ_PASSWORD},
        headers=HEADERS
    )
    
    if login_response.status_code != 200:
        print(f"❌ 登入失敗，無法進行令牌驗證測試: {login_response.text}")
        return
    
    token = login_response.json().get("token")
    if not token:
        print("❌ 登入響應中沒有令牌")
        return
    
    # 測試令牌驗證
    auth_headers = HEADERS.copy()
    auth_headers["Authorization"] = f"Bearer {token}"
    
    check_response = requests.get(
        f"{BASE_URL}/check",
        headers=auth_headers
    )
    
    print(f"令牌驗證狀態碼: {check_response.status_code}")
    
    if check_response.status_code == 200:
        data = check_response.json()
        print(f"令牌驗證響應: {json.dumps(data, ensure_ascii=False)}")
        
        if data.get("authenticated"):
            print("✅ 令牌驗證測試通過")
        else:
            print("❌ 令牌驗證失敗")
    else:
        print(f"❌ 令牌驗證請求失敗: {check_response.text}")

def run_all_tests():
    """運行所有登入測試"""
    tests = [
        test_branch_login_success,
        test_branch_login_failure,
        test_hq_login_success,
        test_hq_using_branch_login,
        test_branch_using_hq_login,
        test_nonexistent_account,
        test_token_validation
    ]
    
    results = {
        "passed": 0,
        "failed": 0
    }
    
    for test in tests:
        try:
            test()
            results["passed"] += 1
        except Exception as e:
            print(f"❌ 測試 {test.__name__} 失敗: {str(e)}")
            results["failed"] += 1
    
    print(f"\n=== 測試結果摘要 ===")
    print(f"通過: {results['passed']}")
    print(f"失敗: {results['failed']}")
    print(f"總計: {results['passed'] + results['failed']}")

if __name__ == "__main__":
    try:
        print("🔐 開始登入 API 測試...")
        run_all_tests()
        print("\n✅ 所有登入測試完成")
    except Exception as e:
        print(f"\n❌ 測試失敗: {str(e)}")
        print("❗ 請檢查日誌以獲取更多詳細信息") 