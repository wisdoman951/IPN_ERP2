# app/routes/sales_order_routes.py
from flask import Blueprint, request, jsonify
from app.models.sales_order_model import (
    create_sales_order, 
    get_all_sales_orders, # <--- 導入新函數
    delete_sales_orders_by_ids # <--- 導入新函數
)
import traceback

sales_order_bp = Blueprint('sales_order_bp', __name__, url_prefix='/api/sales-orders')

@sales_order_bp.route('', methods=['POST'])
def add_sales_order_route():
    order_data = request.json
    if not order_data or not isinstance(order_data.get('items'), list):
        return jsonify({"success": False, "error": "請求數據無效或缺少品項列表"}), 400
    
    try:
        # 您可以在這裡生成唯一的 order_number
        from datetime import datetime
        order_data['order_number'] = f"SO-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        result = create_sales_order(order_data)
        return jsonify(result), 201
    except Exception as e:
        tb_str = traceback.format_exc()
        print(f"Error in add_sales_order_route: {e}\n{tb_str}")
        return jsonify({"success": False, "error": "伺服器內部錯誤"}), 500

# ***** 新增：獲取銷售單列表的路由 *****
@sales_order_bp.route('', methods=['GET'])
def get_sales_orders_route():
    """獲取銷售單列表 (可帶 keyword 搜尋)"""
    try:
        keyword = request.args.get('keyword', None)
        result = get_all_sales_orders(keyword)
        if result.get("success"):
            # 直接返回數據列表
            return jsonify(result.get("data", [])), 200
        else:
            return jsonify({"error": result.get("error", "獲取列表失敗")}), 500
    except Exception as e:
        print(f"Error in get_sales_orders_route: {e}")
        return jsonify({"error": "伺服器內部錯誤"}), 500

# ***** 新增：刪除銷售單的路由 *****
@sales_order_bp.route('/delete', methods=['POST'])
def delete_sales_orders_route():
    """根據 ID 列表刪除銷售單"""
    data = request.json
    ids_to_delete = data.get('ids')
    if not ids_to_delete or not isinstance(ids_to_delete, list):
        return jsonify({"error": "請提供一個包含銷售單 ID 的列表"}), 400
    
    try:
        result = delete_sales_orders_by_ids(ids_to_delete)
        return jsonify(result)
    except Exception as e:
        print(f"Error in delete_sales_orders_route: {e}")
        return jsonify({"error": "伺服器內部錯誤"}), 500