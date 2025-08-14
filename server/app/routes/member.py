# server/app/routes/member.py

import pandas as pd
import io
import traceback
from flask import Blueprint, request, jsonify, send_file
from app.middleware import auth_required  # <-- 改為使用 auth_required
from app.models.member_model import (
    get_all_members,
    search_members,
    create_member,
    update_member,
    get_member_by_id,
    check_member_exists,
    check_member_code_exists,
    get_next_member_code,
    delete_member_and_related_data as delete_member_model
)

member_bp = Blueprint("member", __name__)

# 統一處理根路徑和 /list 路徑
@member_bp.route("/", methods=["GET"])
@member_bp.route("/list", methods=["GET"])
@auth_required  # <-- 改為使用 auth_required
def get_members():
    """根據使用者權限獲取會員列表"""
    try:
        # 從 request 中獲取由中介層注入的資訊
        user_store_level = request.store_level
        user_store_id = request.store_id
        
        # 將權限資訊傳遞給 model
        members = get_all_members(store_level=user_store_level, store_id=user_store_id)
        return jsonify(members)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"獲取會員列表時發生錯誤: {str(e)}"}), 500

@member_bp.route("/search", methods=["GET"])
@auth_required # <-- 改為使用 auth_required
def search_members_route():
    """根據關鍵字和使用者權限搜尋會員"""
    keyword = request.args.get("keyword", "")
    try:
        # 從 request 中獲取使用者權限資訊
        user_store_level = request.store_level
        user_store_id = request.store_id
        
        # 將關鍵字和權限資訊都傳遞給 model
        members = search_members(keyword, store_level=user_store_level, store_id=user_store_id)
        return jsonify(members)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"搜尋會員時發生錯誤: {str(e)}"}), 500

@member_bp.route("/create", methods=["POST"])
@auth_required # <-- 改為使用 auth_required
def create_member_route():
    """新增會員，並自動歸屬到當前分店"""
    data = request.json
    try:
        # 獲取當前使用者的 store_id
        user_store_id = request.store_id

        member_code = data.get("member_code")
        if not member_code:
            return jsonify({"error": "會員代碼為必填欄位。"}), 400
        if check_member_code_exists(member_code):
            return jsonify({"error": "會員代碼已存在，請使用其他代碼。"}), 400

        # --- 介紹人 ID 的驗證邏輯 ---
        inferrer_id = data.get("inferrer_id")
        if inferrer_id and str(inferrer_id).strip():
            try:
                numeric_inferrer_id = int(inferrer_id)
                if not check_member_exists(numeric_inferrer_id):
                    return jsonify({"error": f"介紹人 ID '{inferrer_id}' 不存在，請確認後再提交。"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": f"介紹人 ID '{inferrer_id}' 格式不正確。"}), 400
        
        if not data.get('name') or not data.get('birthday'):
            return jsonify({"error": "姓名和生日為必填欄位。"}), 400
        
        # 呼叫 model 函式新增會員，並傳入當前使用者的 store_id
        create_member(data, user_store_id)
        
        return jsonify({"message": "會員新增成功"}), 201
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"新增會員時發生錯誤: {str(e)}"}), 500

@member_bp.route("/<int:member_id>", methods=["DELETE"])
@auth_required # <-- 改為使用 auth_required
def delete_member_route(member_id):
    """刪除會員，並進行權限檢查"""
    try:
        # --- 權限檢查 ---
        user_store_level = request.store_level
        user_store_id = request.store_id
        
        member_to_delete = get_member_by_id(member_id)
        if not member_to_delete:
            return jsonify({"error": "找不到該會員"}), 404
        
        # 如果是分店，檢查是否在操作自己的會員
        if user_store_level == '分店' and member_to_delete['store_id'] != user_store_id:
            return jsonify({"error": "權限不足，無法刪除非本店會員"}), 403
        # --- 權限檢查結束 ---
        
        result = delete_member_model(member_id)
        if result.get("success"):
            return jsonify(result), 200
        else:
            return jsonify({"error": result.get("error")}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"刪除會員時發生錯誤: {str(e)}"}), 500

@member_bp.route("/<int:member_id>", methods=["PUT"])
@auth_required # <-- 改為使用 auth_required
def update_member_route(member_id):
    """更新會員資料，並進行權限檢查"""
    data = request.json
    try:
        # --- 權限檢查 ---
        user_store_level = request.store_level
        user_store_id = request.store_id

        member_to_update = get_member_by_id(member_id)
        if not member_to_update:
            return jsonify({"error": "找不到該會員"}), 404
            
        if user_store_level == '分店' and member_to_update['store_id'] != user_store_id:
            return jsonify({"error": "權限不足，無法修改非本店會員資料"}), 403
        # --- 權限檢查結束 ---

        member_data = {
            "name": data.get("name"), "birthday": data.get("birthday"), "address": data.get("address"),
            "phone": data.get("phone"), "gender": data.get("gender"), 
            "blood_type": data.get("bloodType") or data.get("blood_type"),
            "line_id": data.get("lineId") or data.get("line_id"),
            "inferrer_id": data.get("inferrerId") or data.get("inferrer_id"),
            "occupation": data.get("occupation"), "note": data.get("note")
        }
        update_member(member_id, member_data)
        return jsonify({"message": "會員更新成功"}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"更新會員時發生錯誤: {str(e)}"}), 500
    
@member_bp.route("/export", methods=["GET"])
@auth_required # <-- 改為使用 auth_required
def export_members():
    """根據權限匯出會員資料為Excel檔案"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        
        # 根據權限獲取會員資料
        members = get_all_members(store_level=user_store_level, store_id=user_store_id) 
        
        if not members:
            return jsonify({"message": "沒有可匯出的會員資料。"}), 404

        df = pd.DataFrame(members)
        
        column_mapping = {
            'member_id': '會員編號', 'member_code': '會員代碼', 'name': '姓名',
            'birthday': '生日', 'address': '地址', 'phone': '電話', 'gender': '性別',
            'blood_type': '血型', 'line_id': 'Line ID', 'inferrer_id': '推薦人編號',
            'occupation': '職業', 'note': '備註', 'store_id': '所屬分店ID'
        }
        df = df.rename(columns=column_mapping)
            
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='會員資料')
            workbook = writer.book
            worksheet = writer.sheets['會員資料']
            header_format = workbook.add_format({'bold': True, 'bg_color': '#D9EAD3', 'border': 1})
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            for i, col in enumerate(df.columns):
                column_width = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.set_column(i, i, column_width)

        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='會員資料.xlsx'
        )
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"匯出時發生錯誤: {str(e)}"}), 500

@member_bp.route("/<int:member_id>", methods=["GET"])
@auth_required # <-- 改為使用 auth_required
def get_member_route(member_id):
    """根據ID獲取單一會員資料，並進行權限檢查"""
    try:
        member = get_member_by_id(member_id)
        if not member:
            return jsonify({"error": "會員不存在"}), 404
        
        # --- 權限檢查 ---
        user_store_level = request.store_level
        user_store_id = request.store_id
        if user_store_level == '分店' and member['store_id'] != user_store_id:
            return jsonify({"error": "權限不足，無法查看非本店會員資料"}), 403
        # --- 權限檢查結束 ---
            
        return jsonify(member)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"獲取會員資料時發生錯誤: {str(e)}"}), 500

# --- 不需要權限資訊的輔助路由 ---

@member_bp.route("/check/<int:member_id>", methods=["GET"])
@auth_required # 加上認證，避免被惡意查詢
def check_member_exists_route(member_id):
    """檢查會員是否存在"""
    try:
        exists = check_member_exists(member_id)
        return jsonify({"exists": exists})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@member_bp.route('/check-code/<string:member_code>', methods=['GET'])
@auth_required  # 加上認證，避免被惡意查詢
def check_member_code_route(member_code):
    """檢查會員代碼是否存在"""
    try:
        exists = check_member_code_exists(member_code)
        return jsonify({"exists": exists})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@member_bp.route('/next-code', methods=['GET'])
@auth_required # 加上認證，避免被濫用
def get_next_code_route():
    """提供下一個可用的會員編號"""
    try:
        result = get_next_member_code()
        if result.get("success"):
            return jsonify(result)
        else:
            return jsonify({"error": result.get("error", "無法獲取編號")}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "伺服器內部錯誤"}), 500
