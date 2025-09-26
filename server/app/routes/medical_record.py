# server\app\routes\medical_record.py
import io
import json
import traceback
import pandas as pd

from flask import Blueprint, request, jsonify, send_file
from app.middleware import auth_required, admin_required, get_user_from_token
from app.models.medical_record_model import (
    get_all_medical_records,
    search_medical_records,
    create_medical_record,
    delete_medical_record as delete_medical_record_model,
    get_medical_record_by_id,
    update_medical_record as update_medical_record_model,
    format_record
)

medical_bp = Blueprint("medical", __name__)

@medical_bp.route("/list", methods=["GET"])
@auth_required
def list_medical_records():
    """根據權限獲取健康理療記錄列表"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        records = get_all_medical_records(store_level=user_store_level, store_id=user_store_id)
        return jsonify(records)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@medical_bp.route("/search", methods=["GET"])
@auth_required
def search_medical():
    """根據權限和關鍵字搜尋健康理療記錄"""
    keyword = request.args.get("keyword", "")
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        result = search_medical_records(keyword, store_level=user_store_level, store_id=user_store_id)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@medical_bp.route("/create", methods=["POST"])
@auth_required
def create():
    """新增健康理療記錄，並歸屬於當前分店"""
    data = request.json
    
    try:
        user = get_user_from_token(request)
        if user and user.get("store_id") and not data.get("store_id"):
            data["store_id"] = user.get("store_id")
        if user and user.get("staff_id") and not data.get("staff_id"):
            data["staff_id"] = user.get("staff_id")

        record_id = create_medical_record(data, data["store_id"])
        return jsonify({"success": True, "id": record_id}), 201

    except ValueError as ve:
        print(f"--- [ERROR] ValueError in create route: {ve}")
        traceback.print_exc()
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print(f"--- [ERROR] Exception in create route: {e}")
        traceback.print_exc()
        return jsonify({"error": f"創建醫療記錄時發生錯誤: {str(e)}"}), 500

@medical_bp.route("/delete/<int:record_id>", methods=["DELETE"])
@auth_required
def delete(record_id):
    """刪除健康理療記錄，並進行權限檢查"""
    try:
        # --- 權限檢查 ---
        user_store_level = request.store_level
        user_store_id = request.store_id

        record_to_delete = get_medical_record_by_id(record_id)
        if not record_to_delete:
            return jsonify({"error": "記錄不存在"}), 404

        if user_store_level == '分店' and record_to_delete['store_id'] != user_store_id:
            return jsonify({"error": "權限不足，無法刪除非本店的記錄"}), 403
        # --- 權限檢查結束 ---

        success = delete_medical_record_model(record_id)
        if success:
            return jsonify({"success": True})
        else:
            return jsonify({"error": "記錄不存在或刪除失敗"}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@medical_bp.route("/export", methods=["GET"])
@auth_required
def export_medical_records():
    """根據權限匯出健康理療記錄為Excel"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        records = get_all_medical_records(store_level=user_store_level, store_id=user_store_id)
        
        if not records:
             return jsonify({"message": "沒有可匯出的資料"}), 404

        df = pd.DataFrame(records, columns=[
            'ID', '店別', '會員編號', '姓名', '身高', '體重',
            '血壓', '病史', '微整', '微整備註'
        ])

        df = df.rename(columns={
            'ID': '記錄ID', '店別': '店別', '姓名': '姓名', '會員編號': '會員編號', '身高': '身高',
            '體重': '體重', '血壓': '血壓', '病史': '病史摘要',
            '微整': '有否微整', '微整備註': '微整描述'
        })
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='健康理療記錄')
        output.seek(0)
        
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            download_name="medical_records.xlsx",
            as_attachment=True
        )
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@medical_bp.route("/<int:record_id>", methods=["GET"])
@auth_required
def get_record(record_id):
    """獲取單筆健康理療記錄，並進行權限檢查"""
    try:
        record = get_medical_record_by_id(record_id)
        if not record:
            return jsonify({"error": "記錄不存在"}), 404
        
        # --- 權限檢查 ---
        user_store_level = request.store_level
        user_store_id = request.store_id
        if user_store_level == '分店' and record['store_id'] != user_store_id:
            return jsonify({"error": "權限不足，無法查看非本店的記錄"}), 403
        # --- 權限檢查結束 ---
            
        return jsonify(record)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@medical_bp.route("/update/<int:record_id>", methods=["PUT"])
@auth_required
def update(record_id):
    """更新健康理療記錄，並進行權限檢查"""
    try:
        # --- 權限檢查 ---
        user_store_level = request.store_level
        user_store_id = request.store_id

        record_to_update = get_medical_record_by_id(record_id)
        if not record_to_update:
            return jsonify({"error": "記錄不存在"}), 404

        if user_store_level == '分店' and record_to_update['store_id'] != user_store_id:
            return jsonify({"error": "權限不足，無法修改非本店的記錄"}), 403
        # --- 權限檢查結束 ---

        data = request.get_json()
        success = update_medical_record_model(record_id, data)
        if success:
            return jsonify({"success": True})
        else:
            return jsonify({"error": "更新失敗"}), 400
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"更新醫療記錄時發生錯誤: {str(e)}"}), 500
