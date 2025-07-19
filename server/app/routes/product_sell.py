from flask import Blueprint, request, jsonify, send_file
import pandas as pd
import io
from app.models.product_sell_model import (
    get_all_product_sells, 
    search_product_sells, 
    get_product_sell_by_id,
    insert_product_sell, 
    update_product_sell, 
    delete_product_sell,
    get_all_products_with_inventory,
    search_products_with_inventory,
    export_product_sells
)
from app.models.product_model import insert_product
from app.middleware import auth_required, admin_required, get_user_from_token

product_sell_bp = Blueprint("product_sell", __name__, url_prefix='/api/product-sell')

# --- 銷售紀錄相關路由 (維持不變) ---
@product_sell_bp.route("/list", methods=["GET"])
@auth_required
def get_sales():
    """獲取產品銷售記錄 (已根據店家權限過濾)"""
    try:
        user = get_user_from_token(request)
        store_id = user.get('store_id') if user and user.get('permission') != 'admin' else None
        
        # 如果是總店(admin)，store_id 為 None，獲取所有紀錄
        # 如果是分店，則只返回該店鋪的記錄
        sales = get_all_product_sells(store_id=store_id)
        return jsonify(sales)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@product_sell_bp.route("/detail/<int:sale_id>", methods=["GET"])
@auth_required
def get_sale_detail(sale_id):
    """獲取產品銷售記錄詳情"""
    try:
        sale = get_product_sell_by_id(sale_id)
        if not sale:
            return jsonify({"error": "找不到產品銷售記錄"}), 404
        
        user = get_user_from_token(request)
        user_store_id = user.get('store_id')
        user_permission = user.get('permission')

        # 總店(admin)可以查看所有紀錄，分店只能看自己的
        if user_permission != 'admin' and sale.get('store_id') != user_store_id:
            return jsonify({"error": "無權限查看其他商店的記錄"}), 403
            
        return jsonify(sale)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@product_sell_bp.route("/search", methods=["GET"])
@auth_required
def search_sales():
    """搜尋產品銷售記錄 (已根據店家權限過濾)"""
    keyword = request.args.get("keyword", "")
    try:
        user = get_user_from_token(request)
        store_id = user.get('store_id') if user and user.get('permission') != 'admin' else None
        
        sales = search_product_sells(keyword, store_id=store_id)
        return jsonify(sales)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
# --- 新增、更新、刪除等路由維持不變 ---
@product_sell_bp.route("/add", methods=["POST"])
@auth_required
def add_sale():
    data = request.json
    try:
        user = get_user_from_token(request)
        if user and user.get("store_id") and not data.get("store_id"):
            data["store_id"] = user.get("store_id")
        if user and user.get("staff_id") and not data.get("staff_id"):
             data["staff_id"] = user.get("staff_id")
        
        sale_id = insert_product_sell(data)
        return jsonify({"message": "產品銷售記錄新增成功", "id": sale_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@product_sell_bp.route("/update/<int:sale_id>", methods=["PUT"])
@auth_required
def update_sale(sale_id):
    data = request.json
    try:
        sale = get_product_sell_by_id(sale_id)
        if not sale:
            return jsonify({"error": "找不到產品銷售記錄"}), 404
            
        user = get_user_from_token(request)
        if user and user.get('permission') != 'admin' and sale.get('store_id') != user.get('store_id'):
            return jsonify({"error": "無權限修改其他商店的記錄"}), 403
            
        update_product_sell(sale_id, data)
        return jsonify({"message": "產品銷售記錄更新成功"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@product_sell_bp.route("/delete/<int:sale_id>", methods=["DELETE"])
@auth_required
def delete_sale(sale_id):
    try:
        sale = get_product_sell_by_id(sale_id)
        if not sale:
            return jsonify({"error": "找不到產品銷售記錄"}), 404
            
        user = get_user_from_token(request)
        if user and user.get('permission') != 'admin' and sale.get('store_id') != user.get('store_id'):
            return jsonify({"error": "無權限刪除其他商店的記錄"}), 403
            
        delete_product_sell(sale_id)
        return jsonify({"message": "產品銷售記錄刪除成功"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- 產品庫存相關路由 (重要修改) ---

@product_sell_bp.route("/products", methods=["GET"])
@auth_required
def get_products():
    """
    獲取所有產品及對應庫存。
    會根據登入者的身份 (總店/分店) 過濾庫存。
    """
    try:
        user = get_user_from_token(request)
        target_store_id = None

        # 如果權限不是 'admin' (即為分店)，則設定 target_store_id
        if user and user.get('permission') != 'admin':
            target_store_id = user.get('store_id')

        # 將解析出的 store_id 傳遞給 model function
        products = get_all_products_with_inventory(store_id=target_store_id)
        return jsonify(products)
    except Exception as e:
        print(f"Error in get_products: {e}")
        return jsonify({"error": f"無法獲取產品列表: {str(e)}"}), 500


@product_sell_bp.route("/products", methods=["POST"])
@admin_required
def create_product():
    """新增產品"""
    data = request.json
    if not all(k in data for k in ("code", "name", "price")):
        return jsonify({"error": "缺少必要欄位"}), 400
    try:
        product_id = insert_product(data)
        return jsonify({"message": "產品新增成功", "product_id": product_id}), 201
    except Exception as e:
        if "Duplicate entry" in str(e):
            return jsonify({"error": "產品編號已存在"}), 409
        return jsonify({"error": str(e)}), 500

@product_sell_bp.route("/products/search", methods=["GET"])
@auth_required
def search_product():
    """
    搜尋產品及對應庫存。
    同樣會根據登入者身份過濾庫存。
    """
    keyword = request.args.get("keyword", "")
    try:
        user = get_user_from_token(request)
        target_store_id = None
        
        # 如果權限不是 'admin' (即為分店)，則設定 target_store_id
        if user and user.get('permission') != 'admin':
            target_store_id = user.get('store_id')

        # 將關鍵字和 store_id 一起傳遞給 model function
        products = search_products_with_inventory(keyword, store_id=target_store_id)
        return jsonify(products)
    except Exception as e:
        print(f"Error in search_product: {e}")
        return jsonify({"error": f"搜尋產品時發生錯誤: {str(e)}"}), 500

# --- 匯出功能路由 (維持不變) ---
@product_sell_bp.route("/export", methods=["GET"])
@auth_required
def export_sales():
    """匯出產品銷售紀錄 (已根據店家權限過濾)"""
    try:
        user = get_user_from_token(request)
        store_id = user.get('store_id') if user and user.get('permission') != 'admin' else None
        
        sales_data = export_product_sells(store_id=store_id)
        
        df = pd.DataFrame(sales_data)
        
        # 欄位重新命名以符合匯出需求
        df.rename(columns={
            'product_sell_id': '銷售ID', 'member_name': '會員姓名', 'store_name': '商店名稱',
            'product_name': '產品名稱', 'quantity': '銷售數量', 'unit_price': '單價',
            'discount_amount': '折扣金額', 'final_price': '最終價格', 'payment_method': '付款方式',
            'staff_name': '銷售人員', 'sale_category': '銷售類別', 'date': '日期', 'note': '備註'
        }, inplace=True)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='銷售紀錄')
            workbook = writer.book
            worksheet = writer.sheets['銷售紀錄']
            header_format = workbook.add_format({
                'bold': True, 'bg_color': '#D9EAD3', 'border': 1
            })
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                column_width = max(df[value].astype(str).map(len).max(), len(str(value))) + 2
                worksheet.set_column(col_num, col_num, column_width)

        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='產品銷售紀錄.xlsx'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
