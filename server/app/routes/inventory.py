from flask import Blueprint, request, jsonify, send_file
import pandas as pd
import io
from datetime import datetime
import json
from app.models.inventory_model import (
    get_all_inventory,
    search_inventory,
    get_inventory_by_id,
    update_inventory_item,
    add_inventory_item,
    delete_inventory_item,
    get_low_stock_inventory,
    get_product_list,
    export_inventory_data,
    get_inventory_history
)
from app.middleware import auth_required, get_user_from_token

inventory_bp = Blueprint("inventory", __name__)

@inventory_bp.route("/list", methods=["GET"])
@auth_required
def get_inventory_list():
    """根據權限獲取庫存記錄"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        store_id_param = request.args.get('store_id')

        # 管理員可選擇 store_id；分店則固定為自身
        target_store = store_id_param if is_admin else user_store_id

        inventory_list = get_all_inventory(target_store)
        return jsonify(inventory_list)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/search", methods=["GET"])
@auth_required
def search_inventory_items():
    """搜尋庫存記錄"""
    keyword = request.args.get("keyword", "")
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        store_id_param = request.args.get('store_id')

        target_store = store_id_param if is_admin else user_store_id

        inventory_list = search_inventory(keyword, target_store)
        return jsonify(inventory_list)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/low-stock", methods=["GET"])
@auth_required
def get_low_stock_items():
    """獲取低於閾值的庫存記錄"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        store_id_param = request.args.get('store_id')

        target_store = store_id_param if is_admin else user_store_id

        inventory_list = get_low_stock_inventory(target_store)
        return jsonify(inventory_list)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/records", methods=["GET"])
@auth_required
def get_inventory_records():
    """取得庫存進出明細"""
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    sale_staff = request.args.get("sale_staff")
    buyer = request.args.get("buyer")
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        store_id_param = request.args.get('store_id')

        target_store = store_id_param if is_admin else user_store_id

        records = get_inventory_history(target_store, start_date, end_date, sale_staff, buyer)
        return jsonify(records)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/<int:inventory_id>", methods=["GET"])
@auth_required
def get_inventory_item(inventory_id):
    """根據ID獲取庫存記錄"""
    try:
        inventory_item = get_inventory_by_id(inventory_id)
        if not inventory_item:
            return jsonify({"error": "找不到該庫存記錄"}), 404

        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        if not is_admin and inventory_item.get('Store_ID') != user_store_id:
            return jsonify({"error": "無權查看其他分店的庫存紀錄"}), 403

        return jsonify(inventory_item)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/update/<int:inventory_id>", methods=["PUT"])
@auth_required
def update_inventory(inventory_id):
    """更新庫存記錄"""
    data = request.json
    try:
        existing = get_inventory_by_id(inventory_id)
        if not existing:
            return jsonify({"error": "找不到該庫存記錄"}), 404

        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        if not is_admin and existing.get('Store_ID') != user_store_id:
            return jsonify({"error": "無權修改其他分店的庫存紀錄"}), 403

        success = update_inventory_item(inventory_id, data)
        if success:
            return jsonify({"message": "庫存記錄更新成功", "success": True}), 200
        else:
            return jsonify({"error": "庫存記錄更新失敗"}), 400
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/add", methods=["POST"])
@auth_required
def add_inventory():
    """新增庫存記錄"""
    data = request.json
    try:
        user_info = get_user_from_token(request)
        user_store_level = user_info.get('store_level')
        user_store_id = user_info.get('store_id')
        is_admin = user_store_level == '總店' or user_info.get('permission') == 'admin'

        if not data.get('storeId'):
            data['storeId'] = user_store_id
        elif not is_admin and int(data.get('storeId')) != user_store_id:
            return jsonify({"error": "無權為其他分店新增庫存"}), 403

        if user_info.get('staff_id') and not data.get('staffId'):
            data['staffId'] = user_info.get('staff_id')

        success = add_inventory_item(data)
        if success:
            return jsonify({"message": "庫存記錄新增成功", "success": True}), 201
        else:
            return jsonify({"error": "庫存記錄新增失敗"}), 400
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/delete/<int:inventory_id>", methods=["DELETE"])
@auth_required
def delete_inventory(inventory_id):
    """刪除庫存記錄"""
    try:
        existing = get_inventory_by_id(inventory_id)
        if not existing:
            return jsonify({"error": "找不到該庫存記錄"}), 404

        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        if not is_admin and existing.get('Store_ID') != user_store_id:
            return jsonify({"error": "無權刪除其他分店的庫存紀錄"}), 403

        success = delete_inventory_item(inventory_id)
        if success:
            return jsonify({"message": "庫存記錄刪除成功", "success": True}), 200
        else:
            return jsonify({"error": "庫存記錄刪除失敗"}), 400
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/products", methods=["GET"])
def get_inventory_products():
    """獲取所有可用於庫存管理的產品列表"""
    try:
        products = get_product_list()
        return jsonify(products)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/export", methods=["GET"])
@auth_required
def export_inventory():
    """匯出庫存資料為Excel"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        store_id_param = request.args.get('store_id')
        target_store = None if is_admin and not store_id_param else (store_id_param or user_store_id)

        inventory_data = export_inventory_data(target_store)
        
        # 使用pandas創建DataFrame
        df = pd.DataFrame(inventory_data)
        
        # 創建Excel文件
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='InventoryData')
            
            # 美化Excel
            workbook = writer.book
            worksheet = writer.sheets['InventoryData']
            
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
            download_name='庫存記錄.xlsx'
        )
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500 