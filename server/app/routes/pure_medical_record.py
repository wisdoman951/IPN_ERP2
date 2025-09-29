# server/app/routes/pure_medical_record.py
import io
import pandas as pd
import json
import traceback

from flask import Blueprint, request, jsonify, send_file
from app.models.pure_medical_record_model import (
    get_all_pure_records,
    add_pure_record,
    update_pure_record,
    delete_pure_record,
    get_pure_record_by_id,
)
from app.middleware import auth_required

pure_medical_bp = Blueprint("pure-medical-record", __name__)

@pure_medical_bp.route("", methods=["GET"])
@auth_required
def list_or_search_pure_records():
    """根據權限和關鍵字獲取所有或搜尋淨化健康紀錄"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        # 統一使用 'keyword' 參數，對應前端的單一搜尋框
        keyword = request.args.get("keyword")

        records = get_all_pure_records(user_store_level, user_store_id, keyword)
        return jsonify(records)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@pure_medical_bp.route("/<int:pure_id>", methods=["GET"])
@auth_required
def get_pure_record(pure_id):
    """獲取特定淨化健康紀錄，並進行權限檢查"""
    try:
        record = get_pure_record_by_id(pure_id)
        if not record:
            return jsonify({"error": "找不到該紀錄"}), 404

        # 權限檢查
        user_store_level = request.store_level
        user_store_id = request.store_id
        if user_store_level == '分店' and record.get('store_id') != user_store_id:
            return jsonify({"error": "權限不足，無法查看非本店紀錄"}), 403

        return jsonify(record)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@pure_medical_bp.route("", methods=["POST"])
@auth_required
def create_pure_record():
    """新增淨化健康紀錄，並自動歸屬到當前分店"""
    try:
        data = request.get_json()
        user_store_id = request.store_id
        
        if not data.get('member_id'):
            return jsonify({"error": "會員編號為必填欄位"}), 400
            
        record_id = add_pure_record(data, user_store_id)
        return jsonify({"success": True, "id": record_id}), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"創建淨化健康紀錄時發生錯誤: {str(e)}"}), 500

@pure_medical_bp.route("/<int:pure_id>", methods=["PUT"])
@auth_required
def update_record(pure_id):
    """更新淨化健康紀錄，並進行權限檢查"""
    try:
        if getattr(request, 'permission', None) == 'therapist':
            return jsonify({"error": "無操作權限"}), 403
        # 權限檢查
        existing_record = get_pure_record_by_id(pure_id)
        if not existing_record:
            return jsonify({"error": "找不到該紀錄"}), 404
        
        user_store_level = request.store_level
        user_store_id = request.store_id
        if user_store_level == '分店' and existing_record.get('store_id') != user_store_id:
            return jsonify({"error": "權限不足，無法修改非本店紀錄"}), 403
            
        data = request.get_json()
        success = update_pure_record(pure_id, data)
        return jsonify({"success": success})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@pure_medical_bp.route("/<int:pure_id>", methods=["DELETE"])
@auth_required
def delete_record(pure_id):
    """刪除淨化健康紀錄，並進行權限檢查"""
    try:
        if getattr(request, 'permission', None) != 'admin':
            return jsonify({"error": "無操作權限"}), 403
        # 權限檢查
        existing_record = get_pure_record_by_id(pure_id)
        if not existing_record:
            return jsonify({"error": "找不到該紀錄"}), 404
        
        user_store_level = request.store_level
        user_store_id = request.store_id
        if user_store_level == '分店' and existing_record.get('store_id') != user_store_id:
            return jsonify({"error": "權限不足，無法刪除非本店紀錄"}), 403
            
        success = delete_pure_record(pure_id)
        if success:
            return jsonify({"success": True})
        else:
            return jsonify({"error": "刪除失敗或紀錄不存在"}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@pure_medical_bp.route("/export", methods=["GET"])
@auth_required
def export_records():
    """導出淨化健康紀錄為Excel檔案"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        # 匯出時也應用權限過濾
        records = get_all_pure_records(user_store_level, user_store_id)
        
        if not records:
            return jsonify({"message": "沒有可匯出的資料"}), 404

        df = pd.DataFrame(records)
        # 重新命名欄位以符合匯出需求
        df = df.rename(columns={
            'ipn_pure_id': '編號', 'Name': '姓名', 'staff_name': '服務人',
            'blood_preasure': '血壓', 'date': '日期', 'height': '身高',
            'weight': '體重', 'visceral_fat': '內脂肪', 
            'body_fat_percentage': '體脂肪(%)', # 新增體脂肪欄位
            'basal_metabolic_rate': '基礎代謝',
            'body_age': '體年齡', 'bmi': 'BMI', 'pure_item': '淨化項目', 'note': '備註'
        })
        # 選擇需要的欄位
        df_export = df[[
            '編號', '姓名', '服務人', '血壓', '日期', '身高', '體重', 
            '體脂肪(%)', '內脂肪', '基礎代謝', '體年齡', 'BMI', '淨化項目', '備註'
        ]]

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df_export.to_excel(writer, index=False, sheet_name='淨化健康紀錄')
        output.seek(0)
        
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            download_name="pure_medical_records.xlsx",
            as_attachment=True
        )
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"導出時發生錯誤: {str(e)}"}), 500
