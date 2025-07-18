import requests
import json
from datetime import datetime

# 配置
BASE_URL = "http://localhost:5000/api/member"  # 修改為你的API地址

def test_db_connection_directly():
    """直接測試資料庫連接，使用Python腳本獲取會員數據"""
    print("========== 直接測試資料庫連接 ==========")
    print("使用Python腳本直接從數據庫獲取會員列表:")
    
    from app.models.member_model import get_all_members
    members = get_all_members()
    print(f"從數據庫獲取 {len(members)} 個會員")
    
    if len(members) > 0:
        print(f"第一個會員數據: {members[0]}")
    
    return members

def test_db_search_directly(keyword="Alice"):
    """直接測試資料庫搜索，使用Python腳本搜索會員"""
    print(f"\n========== 直接測試資料庫搜索 '{keyword}' ==========")
    
    from app.models.member_model import search_members
    members = search_members(keyword)
    print(f"搜索到 {len(members)} 個會員")
    
    if len(members) > 0:
        print(f"搜索結果: {members}")
    
    return members

def test_db_get_member_directly(member_id=1):
    """直接測試獲取會員，使用Python腳本獲取特定會員"""
    print(f"\n========== 直接測試獲取會員 ID {member_id} ==========")
    
    from app.models.member_model import get_member_by_id
    member = get_member_by_id(member_id)
    
    if member:
        print(f"找到會員數據: {member}")
    else:
        print(f"未找到 ID 為 {member_id} 的會員")
    
    return member

def test_db_create_member_directly():
    """直接測試創建會員，使用Python腳本創建會員"""
    print("\n========== 直接測試創建會員 ==========")
    
    from app.models.member_model import create_member
    
    # 創建測試數據
    new_member = {
        "name": f"測試會員_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "birthday": datetime.now().strftime("%Y-%m-%d"),
        "address": "測試地址",
        "phone": "0912345678",
        "gender": "Male",
        "blood_type": "O",
        "line_id": "test_line_id",
        "inferrer_id": None,
        "occupation": "測試職業",
        "note": "測試備註"
    }
    
    try:
        create_member(new_member)
        print("會員創建成功")
        
        # 查詢新創建的會員
        from app.models.member_model import search_members
        search_results = search_members(new_member["name"])
        if search_results:
            print(f"找到新創建的會員: {search_results[0]}")
            return search_results[0]
        else:
            print("未找到新創建的會員")
            return None
    except Exception as e:
        print(f"創建會員時出錯: {str(e)}")
        return None

def test_db_update_member_directly(member_id):
    """直接測試更新會員，使用Python腳本更新會員"""
    print(f"\n========== 直接測試更新會員 ID {member_id} ==========")
    
    if not member_id:
        print("未提供有效的會員ID，跳過更新測試")
        return None
    
    from app.models.member_model import update_member, get_member_by_id
    
    # 先獲取現有會員資料，以保留所有必填欄位
    existing_member = get_member_by_id(member_id)
    if not existing_member:
        print(f"會員 ID {member_id} 不存在，跳過更新測試")
        return None
    
    # 更新數據，保留所有必填欄位
    update_data = {
        "name": f"更新會員_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "birthday": existing_member["birthday"],  # 重要：保留原始生日
        "address": "更新的地址",
        "phone": "0987654321",
        "gender": existing_member["gender"],
        "blood_type": existing_member["blood_type"],
        "line_id": existing_member["line_id"],
        "inferrer_id": existing_member["inferrer_id"],
        "occupation": "更新的職業",
        "note": "更新的備註"
    }
    
    try:
        update_member(member_id, update_data)
        print(f"會員 ID {member_id} 更新成功")
        
        # 查詢更新後的會員
        updated_member = get_member_by_id(member_id)
        if updated_member:
            print(f"更新後的會員數據: {updated_member}")
            return updated_member
        else:
            print(f"未找到更新後的會員 ID {member_id}")
            return None
    except Exception as e:
        print(f"更新會員時出錯: {str(e)}")
        return None

def test_db_delete_member_directly(member_id):
    """直接測試刪除會員，使用Python腳本刪除會員"""
    print(f"\n========== 直接測試刪除會員 ID {member_id} ==========")
    
    if not member_id:
        print("未提供有效的會員ID，跳過刪除測試")
        return False
    
    from app.models.member_model import delete_member, get_member_by_id
    
    # 確認會員存在
    member = get_member_by_id(member_id)
    if not member:
        print(f"會員 ID {member_id} 不存在，無法刪除")
        return False
    
    try:
        delete_member(member_id)
        print(f"會員 ID {member_id} 刪除成功")
        
        # 確認會員已刪除
        deleted_member = get_member_by_id(member_id)
        if not deleted_member:
            print(f"確認會員 ID {member_id} 已被刪除")
            return True
        else:
            print(f"會員 ID {member_id} 仍然存在，刪除失敗")
            return False
    except Exception as e:
        print(f"刪除會員時出錯: {str(e)}")
        return False

def run_all_direct_tests():
    """運行所有直接測試"""
    # 測試數據庫連接和查詢
    test_db_connection_directly()
    test_db_search_directly("Alice")
    test_db_get_member_directly(1)
    
    # 測試創建-更新-刪除流程
    new_member = test_db_create_member_directly()
    if new_member and new_member.get('member_id'):
        member_id = new_member['member_id']
        test_db_update_member_directly(member_id)
        test_db_delete_member_directly(member_id)

if __name__ == "__main__":
    run_all_direct_tests() 