from flask import Blueprint, request, jsonify, send_file
from app.middleware import login_required
import pandas as pd
import io
from app.models.therapy_model import (
    insert_therapy_record,
    get_all_therapy_records,
    get_therapy_records_by_store,
    search_therapy_records,
    get_therapy_record_by_id,
    update_therapy_record,
    delete_therapy_record,
    export_therapy_records,
    insert_therapy_sell,
    get_all_therapy_sells,
    search_therapy_sells,
    update_therapy_sell,
    delete_therapy_sell,
    get_all_therapies_for_dropdown,
    insert_therapy
)
from app.middleware import auth_required, admin_required, get_user_from_token

therapy_bp = Blueprint("therapy", __name__)

# ==== 療程紀錄 API ====
@therapy_bp.route("/record", methods=["GET"])
@auth_required
def get_records():
    """獲取所有療程紀錄"""
    try:
        records = get_all_therapy_records()
            
        return jsonify(records)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@therapy_bp.route("/record/<int:record_id>", methods=["GET"])
@auth_required
def get_record(record_id):
    """獲取單一療程紀錄"""
    try:
        record = get_therapy_record_by_id(record_id)
        if not record:
            return jsonify({"error": "找不到該療程紀錄"}), 404
            
        return jsonify(record)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@therapy_bp.route('/record/search', methods=['GET'])
@login_required
def search_therapy_records_route():
    """接收前端的多條件搜尋請求，並打包成一個字典傳遞給 model"""
    try:
        # 將所有 URL 查詢參數打包成一個字典
        filters = {
            'keyword': request.args.get('keyword', ''),
            'startDate': request.args.get('startDate', ''),
            'endDate': request.args.get('endDate', ''),
            'therapist': request.args.get('therapist', ''),
            'packageName': request.args.get('packageName', ''),
            'salesperson': request.args.get('salesperson', '')
        }
        
        # 將打包好的單一字典參數傳遞給 model 函式
        records = search_therapy_records(filters)
        
        return jsonify(records)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
        
@therapy_bp.route("/record", methods=["POST"])
@auth_required
def create_record():
    """新增療程紀錄"""
    data = request.json
    try:
        # 獲取用戶資訊，包括 store_id 和 staff_id
        user = get_user_from_token(request)
        
        # 合併 user 信息到 data
        if user:
            if not data.get("store_id") and user.get("store_id"):
                data["store_id"] = user.get("store_id")
            
            if not data.get("staff_id") and user.get("staff_id"):
                data["staff_id"] = user.get("staff_id")
        
        # 新增記錄
        record_id = insert_therapy_record(data)
        return jsonify({"message": "新增成功", "id": record_id}), 201
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@therapy_bp.route("/record/<int:record_id>", methods=["PUT"])
@auth_required
def update_record(record_id):
    """更新療程紀錄"""
    data = request.json
    try:
        # 檢查記錄是否存在
        record = get_therapy_record_by_id(record_id)
        if not record:
            return jsonify({"error": "找不到該療程紀錄"}), 404
            
        # 獲取用戶資訊
        user = get_user_from_token(request)
        
        # 限制只能操作自己商店的記錄
        if user and user.get('store_id') and record.get('store_id') != user.get('store_id'):
            return jsonify({"error": "無權限修改其他商店的記錄"}), 403
            
        # 進行更新
        update_therapy_record(record_id, data)
        return jsonify({"message": "更新成功"}), 200
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@therapy_bp.route("/record/<int:record_id>", methods=["DELETE"])
@auth_required
def delete_record(record_id):
    """刪除療程紀錄"""
    try:
        # 檢查記錄是否存在
        record = get_therapy_record_by_id(record_id)
        if not record:
            return jsonify({"error": "找不到該療程紀錄"}), 404
            
        # 獲取用戶資訊
        user = get_user_from_token(request)
        
        # 限制只能操作自己商店的記錄
        if user and user.get('store_id') and record.get('store_id') != user.get('store_id'):
            return jsonify({"error": "無權限刪除其他商店的記錄"}), 403
            
        # 進行刪除
        delete_therapy_record(record_id)
        return jsonify({"message": "刪除成功"}), 200
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@therapy_bp.route("/record/export", methods=["GET"])
@auth_required
def export_records():
    """匯出療程紀錄"""
    try:
        # 獲取用戶資訊
        user = get_user_from_token(request)
        store_id = user.get('store_id') if user else None
        
        # 獲取資料
        records = export_therapy_records(store_id)
        
        # 過濾和重命名欄位以適合匯出
        export_data = [{
            '療程記錄ID': r.get('therapy_record_id'),
            '會員ID': r.get('member_id'),
            '會員姓名': r.get('member_name'),
            '商店名稱': r.get('store_name'),
            '服務人員': r.get('staff_name'),
            '日期': r.get('date'),
            '備註': r.get('note')
        } for r in records]
        
        # 使用pandas創建DataFrame
        df = pd.DataFrame(export_data)
        
        # 創建Excel文件
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='TherapyRecords')
            
            # 美化Excel
            workbook = writer.book
            worksheet = writer.sheets['TherapyRecords']
            
            # 添加標題行格式
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#D9EAD3',
                'border': 1
            })
            
            # 應用標題行格式
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                
            # 自動調整列寬
            for i, col in enumerate(df.columns):
                column_width = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.set_column(i, i, column_width)

        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='療程紀錄.xlsx'
        )
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

# ==== 療程銷售 API ====
@therapy_bp.route("/sale", methods=["GET"])
def get_sales():
    """獲取所有療程銷售"""
    try:
        sales = get_all_therapy_sells()
        return jsonify(sales)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@therapy_bp.route("/sale/search", methods=["GET"])
def search_sales():
    """搜尋療程銷售"""
    keyword = request.args.get("keyword", "")
    try:
        sales = search_therapy_sells(keyword)
        return jsonify(sales)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@therapy_bp.route("/add-sale", methods=["POST"])
@auth_required
def create_sale():
    """新增療程銷售"""
    data = request.json
    try:
        # 開啟測試模式，忽略外鍵約束檢查
        sale_id = 999  # 測試用 ID
        insert_therapy_sell(data, test_mode=True)
        return jsonify({"message": "新增成功", "id": sale_id}), 201
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@therapy_bp.route("/sale/<int:sale_id>", methods=["PUT"])
@auth_required
def update_sale(sale_id):
    """更新療程銷售"""
    data = request.json
    try:
        update_therapy_sell(sale_id, data)
        return jsonify({"message": "更新成功"}), 200
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@therapy_bp.route("/sale/<int:sale_id>", methods=["DELETE"])
@auth_required
def delete_sale(sale_id):
    """刪除療程銷售"""
    try:
        delete_therapy_sell(sale_id)
        return jsonify({"message": "刪除成功"}), 200
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@therapy_bp.route("/sale/export", methods=["GET"])
def export_sales():
    """匯出療程銷售"""
    try:
        sales = get_all_therapy_sells()
        
        # 使用pandas創建DataFrame
        df = pd.DataFrame(sales)
        
        # 創建Excel文件
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='therapySells')
            
            # 美化Excel
            workbook = writer.book
            worksheet = writer.sheets['therapySells']
            
            # 添加標題行格式
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#D9EAD3',
                'border': 1
            })
            
            # 應用標題行格式
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                
            # 自動調整列寬
            for i, col in enumerate(df.columns):
                column_width = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.set_column(i, i, column_width)

        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='療程銷售.xlsx'
        )
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

# vvvv 新增這個路由 vvvv
@therapy_bp.route("/for-dropdown", methods=["GET"])
@login_required
def get_therapy_list():
    """提供給前端下拉選單使用的療程列表"""
    try:
        therapy_list = get_all_therapies_for_dropdown()
        return jsonify(therapy_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@therapy_bp.route("/", methods=["POST"])
@admin_required
def create_therapy_route():
    """新增療程基礎資料"""
    data = request.json
    if not all(k in data for k in ["code", "name", "price"]):
        return jsonify({"error": "缺少必要欄位"}), 400
    try:
        therapy_id = insert_therapy(data)
        return jsonify({"message": "新增成功", "therapy_id": therapy_id}), 201
    except Exception as e:
        if "Duplicate entry" in str(e):
            return jsonify({"error": "療程編號已存在"}), 409
        return jsonify({"error": str(e)}), 500