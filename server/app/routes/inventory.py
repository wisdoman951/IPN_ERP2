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
    get_product_list
)
from app.middleware import auth_required

inventory_bp = Blueprint("inventory", __name__)

@inventory_bp.route("/list", methods=["GET"])
def get_inventory_list():
    """獲取所有庫存記錄"""
    try:
        inventory_list = get_all_inventory()
        return jsonify(inventory_list)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/search", methods=["GET"])
def search_inventory_items():
    """搜尋庫存記錄"""
    keyword = request.args.get("keyword", "")
    try:
        inventory_list = search_inventory(keyword)
        return jsonify(inventory_list)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/low-stock", methods=["GET"])
def get_low_stock_items():
    """獲取低於閾值的庫存記錄"""
    try:
        inventory_list = get_low_stock_inventory()
        return jsonify(inventory_list)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@inventory_bp.route("/<int:inventory_id>", methods=["GET"])
def get_inventory_item(inventory_id):
    """根據ID獲取庫存記錄"""
    try:
        inventory_item = get_inventory_by_id(inventory_id)
        if not inventory_item:
            return jsonify({"error": "找不到該庫存記錄"}), 404
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
def export_inventory():
    """匯出庫存資料為Excel"""
    try:
        inventory_data = get_all_inventory()
        
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