# server/app/routes/stress_test.py
from flask import Blueprint, request, jsonify
import traceback
from app.models.stress_test_model import (
    get_all_stress_tests, 
    add_stress_test, 
    update_stress_test,
    delete_stress_test, 
    get_stress_test_by_id,
    get_stress_tests_by_member_id
)
from app.middleware import auth_required

stress_test = Blueprint('stress_test', __name__)

@stress_test.route('', methods=['GET'])
@auth_required
def get_stress_tests():
    """根據權限獲取壓力測試列表"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        
        filters = {
            'name': request.args.get('name'),
            'test_date': request.args.get('test_date')
        }
        
        results = get_all_stress_tests(user_store_level, user_store_id, filters)
        return jsonify({"success": True, "data": results})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@stress_test.route('/member/<int:member_id>', methods=['GET'])
@auth_required
def get_member_stress_tests(member_id):
    """根據權限獲取特定會員的壓力測試列表"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        results = get_stress_tests_by_member_id(member_id, user_store_level, user_store_id)
        return jsonify({"success": True, "data": results})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@stress_test.route('/<int:stress_id>', methods=['GET'])
@auth_required
def get_stress_test(stress_id):
    """獲取單筆壓力測試，並檢查權限"""
    try:
        result = get_stress_test_by_id(stress_id)
        if not result:
            return jsonify({"success": False, "error": "找不到該壓力測試記錄"}), 404

        # 權限檢查
        user_store_level = request.store_level
        user_store_id = request.store_id
        if user_store_level == '分店' and result['store_id'] != user_store_id:
            return jsonify({"error": "權限不足"}), 403
            
        return jsonify({"success": True, "data": result})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@stress_test.route('/add', methods=['POST'])
@auth_required
def add_stress_test_route():
    """新增壓力測試，並歸屬於當前分店"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "無效的請求。"}), 400

    try:
        user_store_id = request.store_id
        member_id = data.get('memberId')
        test_date = data.get('testDate')
        all_answers = {**data.get('formA', {}), **data.get('formB', {})}

        if not member_id or not test_date:
            return jsonify({"error": "必須選擇會員並指定檢測日期。"}), 400

        result = add_stress_test(member_id, test_date, all_answers, user_store_id)

        if result.get("success"):
            return jsonify(result), 201
        else:
            return jsonify({"error": result.get("error", "儲存時發生錯誤")}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"處理請求時發生內部錯誤: {str(e)}"}), 500

@stress_test.route('/<int:stress_id>', methods=['PUT'])
@auth_required
def update_stress_test_route(stress_id):
    """更新壓力測試，並檢查權限"""
    try:
        # 權限檢查
        record_to_update = get_stress_test_by_id(stress_id)
        if not record_to_update:
            return jsonify({"error": "找不到要更新的紀錄"}), 404

        user_store_level = request.store_level
        user_store_id = request.store_id
        if user_store_level == '分店' and record_to_update['store_id'] != user_store_id:
            return jsonify({"error": "權限不足"}), 403

        data = request.json
        scores = {'a_score': data.get('a_score'), 'b_score': data.get('b_score'), 'c_score': data.get('c_score'), 'd_score': data.get('d_score')}
        
        # 檢查分數是否都存在
        if any(s is None for s in scores.values()):
            return jsonify({"error": "缺少分數資料"}), 400

        update_stress_test(stress_id, scores)
        
        return jsonify({"success": True, "message": "壓力測試更新成功"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@stress_test.route('/<int:test_id>', methods=['DELETE'])
@auth_required
def delete_stress_test_route(test_id):
    """刪除壓力測試，並檢查權限"""
    try:
        # 權限檢查
        record_to_delete = get_stress_test_by_id(test_id)
        if not record_to_delete:
            return jsonify({"error": "找不到要刪除的紀錄"}), 404

        user_store_level = request.store_level
        user_store_id = request.store_id
        if user_store_level == '分店' and record_to_delete['store_id'] != user_store_id:
            return jsonify({"error": "權限不足"}), 403

        success = delete_stress_test(test_id)
        if success:
            return jsonify({"success": True, "message": "刪除成功"}), 200
        else:
            return jsonify({"error": "刪除失敗"}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"刪除時發生錯誤: {str(e)}"}), 500
