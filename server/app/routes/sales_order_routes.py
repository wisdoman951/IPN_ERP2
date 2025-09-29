# app/routes/sales_order_routes.py
from flask import Blueprint, request, jsonify, send_file
from app.models.sales_order_model import (
    create_sales_order,
    get_all_sales_orders,
    get_sales_orders_by_ids,
    delete_sales_orders_by_ids,
    get_sales_order_by_id,
    update_sales_order
)
from datetime import datetime
import traceback
import pandas as pd
import io
from app.middleware import auth_required

sales_order_bp = Blueprint('sales_order_bp', __name__, url_prefix='/api/sales-orders')


def _finance_permission():
    return getattr(request, 'permission', None)

@sales_order_bp.route('', methods=['POST'])
@auth_required
def add_sales_order_route():
    order_data = request.json
    if not order_data or not isinstance(order_data.get('items'), list):
        return jsonify({"success": False, "error": "請求數據無效或缺少品項列表"}), 400

    try:
        if _finance_permission() == 'therapist':
            return jsonify({"error": "無操作權限"}), 403
        def generate_order_number(prefix: str = "TP") -> str:
            now = datetime.now()
            return f"{prefix}{now.strftime('%Y%m%d%H%M%S%f')[:-3]}"

        # 根據 store_id 決定銷售單號前綴
        prefix_map = {1: "TP", 2: "TC", 3: "TP", 4: "PH", 5: "TY"}
        store_id = order_data.get("store_id")
        prefix = prefix_map.get(store_id, "TP")
        order_data['order_number'] = order_data.get('order_number') or generate_order_number(prefix)

        result = create_sales_order(order_data)
        status_code = 201 if result.get("success") else 400
        return jsonify(result), status_code
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 422
    except Exception as e:
        tb_str = traceback.format_exc()
        print(f"Error in add_sales_order_route: {e}\n{tb_str}")
        return jsonify({"success": False, "error": "伺服器內部錯誤"}), 500

# ***** 新增：獲取銷售單列表的路由 *****
@sales_order_bp.route('', methods=['GET'])
@auth_required
def get_sales_orders_route():
    """獲取銷售單列表 (可帶 keyword 搜尋)"""
    try:
        if _finance_permission() == 'therapist':
            return jsonify({"error": "無操作權限"}), 403
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

@sales_order_bp.route('/export', methods=['GET'])
@auth_required
def export_sales_orders_route():
    """匯出銷售單列表為 Excel"""
    try:
        if _finance_permission() == 'therapist':
            return jsonify({"error": "無操作權限"}), 403
        keyword = request.args.get('keyword', None)
        result = get_all_sales_orders(keyword)
        if not result.get('success'):
            return jsonify({'error': result.get('error', '獲取列表失敗')}), 500
        orders = result.get('data', [])
        if not orders:
            return jsonify({'message': '沒有可匯出的銷售單資料。'}), 404

        df = pd.DataFrame(orders)
        df.rename(columns={
            'order_id': '銷售單ID',
            'order_number': '銷售單號',
            'order_date': '日期',
            'grand_total': '總計',
            'sale_category': '銷售類別',
            'note': '備註',
            'member_name': '會員姓名',
            'staff_name': '銷售人員'
        }, inplace=True)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='銷售單')
            workbook = writer.book
            worksheet = writer.sheets['銷售單']
            header_format = workbook.add_format({'bold': True, 'bg_color': '#D9EAD3', 'border': 1})
            for col_num, value in enumerate(df.columns):
                worksheet.write(0, col_num, value, header_format)
                column_width = max(df[value].astype(str).map(len).max(), len(value)) + 2
                worksheet.set_column(col_num, col_num, column_width)

        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='銷售單.xlsx'
        )
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'匯出時發生錯誤: {str(e)}'}), 500

@sales_order_bp.route('/export-selected', methods=['POST'])
@auth_required
def export_selected_sales_orders_route():
    """匯出勾選的銷售單列表為 Excel"""
    try:
        if _finance_permission() == 'therapist':
            return jsonify({"error": "無操作權限"}), 403
        data = request.json or {}
        ids = data.get('ids')
        if not ids or not isinstance(ids, list):
            return jsonify({'error': '請提供要匯出的銷售單 ID 列表'}), 400
        result = get_sales_orders_by_ids(ids)
        if not result.get('success'):
            return jsonify({'error': result.get('error', '獲取資料失敗')}), 500
        orders = result.get('data', [])
        if not orders:
            return jsonify({'message': '沒有可匯出的銷售單資料。'}), 404

        df = pd.DataFrame(orders)
        df.rename(columns={
            'order_id': '銷售單ID',
            'order_number': '銷售單號',
            'order_date': '日期',
            'grand_total': '總計',
            'sale_category': '銷售類別',
            'note': '備註',
            'member_name': '會員姓名',
            'staff_name': '銷售人員'
        }, inplace=True)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='銷售單')
            workbook = writer.book
            worksheet = writer.sheets['銷售單']
            header_format = workbook.add_format({'bold': True, 'bg_color': '#D9EAD3', 'border': 1})
            for col_num, value in enumerate(df.columns):
                worksheet.write(0, col_num, value, header_format)
                column_width = max(df[value].astype(str).map(len).max(), len(value)) + 2
                worksheet.set_column(col_num, col_num, column_width)

        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='銷售單.xlsx'
        )
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'匯出時發生錯誤: {str(e)}'}), 500

# ***** 新增：刪除銷售單的路由 *****
@sales_order_bp.route('/delete', methods=['POST'])
@auth_required
def delete_sales_orders_route():
    """根據 ID 列表刪除銷售單"""
    data = request.json
    ids_to_delete = data.get('ids')
    if not ids_to_delete or not isinstance(ids_to_delete, list):
        return jsonify({"error": "請提供一個包含銷售單 ID 的列表"}), 400

    try:
        if _finance_permission() != 'admin':
            return jsonify({"error": "無操作權限"}), 403
        result = delete_sales_orders_by_ids(ids_to_delete)
        return jsonify(result)
    except Exception as e:
        print(f"Error in delete_sales_orders_route: {e}")
        return jsonify({"error": "伺服器內部錯誤"}), 500

@sales_order_bp.route('/<int:order_id>', methods=['GET'])
@auth_required
def get_sales_order_detail_route(order_id):
    try:
        if _finance_permission() == 'therapist':
            return jsonify({"error": "無操作權限"}), 403
        order = get_sales_order_by_id(order_id)
        if not order:
            return jsonify({'error': '找不到銷售單'}), 404
        return jsonify(order), 200
    except Exception as e:
        print(f"Error in get_sales_order_detail_route: {e}")
        return jsonify({'error': '伺服器內部錯誤'}), 500


@sales_order_bp.route('/<int:order_id>', methods=['PUT'])
@auth_required
def update_sales_order_route(order_id):
    order_data = request.json
    if not order_data or not isinstance(order_data.get('items'), list):
        return jsonify({"success": False, "error": "請求數據無效或缺少品項列表"}), 400
    try:
        if _finance_permission() == 'therapist':
            return jsonify({"error": "無操作權限"}), 403
        result = update_sales_order(order_id, order_data)
        status_code = 200 if result.get("success") else 400
        return jsonify(result), status_code
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 422
    except Exception as e:
        tb_str = traceback.format_exc()
        print(f"Error in update_sales_order_route: {e}\n{tb_str}")
        return jsonify({"success": False, "error": "伺服器內部錯誤"}), 500
