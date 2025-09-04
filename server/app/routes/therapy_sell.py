from flask import Blueprint, request, jsonify, send_file
from app.models.therapy_sell_model import (
    get_all_therapy_sells, search_therapy_sells,
    insert_many_therapy_sells , update_therapy_sell, delete_therapy_sell,
    get_all_therapy_packages, search_therapy_packages,
    get_all_members, get_all_staff, get_all_stores,
    get_remaining_sessions, get_remaining_sessions_bulk
)
from app.middleware import auth_required, get_user_from_token
import pandas as pd
import io
from datetime import datetime
import logging
import traceback

logging.basicConfig(level=logging.DEBUG)


therapy_sell = Blueprint('therapy_sell', __name__)


@therapy_sell.route('/sales', methods=['POST'])
def add_therapy_transaction_route():
    sales_list_from_request = request.json

    if not isinstance(sales_list_from_request, list) or not sales_list_from_request:
        return jsonify({"success": False, "error": "請求數據應為一個包含療程銷售項目的非空陣列"}), 400
    
    try:
        result = insert_many_therapy_sells(sales_list_from_request) # 將解析後的列表傳遞

        if isinstance(result, dict) and result.get("success"):
            return jsonify(result), 201
        elif isinstance(result, dict) and "error" in result:
            return jsonify(result), 400
        else:
            return jsonify({"success": False, "error": "伺服器處理時發生未預期的結果格式"}), 500

    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        tb_str = traceback.format_exc() # <--- 獲取完整 Traceback 字串
        return jsonify({"success": False, "error": f"伺服器路由層發生嚴重錯誤: {str(e)}", "traceback": tb_str}), 500


@therapy_sell.route('/packages', methods=['GET'])
def get_packages():
    """獲取所有療程套餐"""
    try:
        result = get_all_therapy_packages()
        return jsonify(result)
    except Exception as e:
        print(f"獲取療程套餐失敗: {e}")
        return jsonify({"error": str(e)}), 500

@therapy_sell.route('/packages/search', methods=['GET'])
def search_packages():
    """搜尋療程套餐"""
    try:
        keyword = request.args.get('keyword', '')
        result = search_therapy_packages(keyword)
        return jsonify(result)
    except Exception as e:
        print(f"搜尋療程套餐失敗: {e}")
        return jsonify({"error": str(e)}), 500

@therapy_sell.route('/sales', methods=['GET'])
@auth_required
def get_sales():
    """根據權限獲取療程銷售紀錄"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id

        # 是否為管理員 (總店)
        is_admin = user_store_level == '總店' or request.permission == 'admin'

        # 若為管理員可透過 query 參數指定店鋪
        store_id_param = request.args.get('store_id')

        # 分店僅能查看自身紀錄
        target_store = store_id_param if is_admin else user_store_id

        result = get_all_therapy_sells(target_store)
        return jsonify(result)
    except Exception as e:
        print(f"獲取療程銷售失敗: {e}")
        return jsonify({"error": str(e)}), 500

@therapy_sell.route('/sales/search', methods=['GET'])
@auth_required
def search_sales():
    """搜尋療程銷售紀錄"""
    try:
        keyword = request.args.get('keyword', '')

        user_store_level = request.store_level
        user_store_id = request.store_id

        is_admin = user_store_level == '總店' or request.permission == 'admin'

        store_id_param = request.args.get('store_id')

        target_store = store_id_param if is_admin else user_store_id

        result = search_therapy_sells(keyword, target_store)
        return jsonify(result)
    except Exception as e:
        print(f"搜尋療程銷售失敗: {e}")
        return jsonify({"error": str(e)}), 500

@therapy_sell.route('/sales', methods=['POST'])
@auth_required
def create_sale():
    """新增療程銷售紀錄"""
    try:
        data = request.get_json()

        user = get_user_from_token(request)
        if user:
            if user.get('store_id') and not data.get('storeId'):
                data['storeId'] = user.get('store_id')
            if user.get('staff_id') and not data.get('staffId'):
                data['staffId'] = user.get('staff_id')
                
        # 驗證必要數據
        if not data.get('memberId'):
            return jsonify({"error": "會員ID不能為空"}), 400
            
        if not data.get('storeId'):
            return jsonify({"error": "店鋪ID不能為空"}), 400
            
        if not data.get('staffId'):
            return jsonify({"error": "銷售人員ID不能為空"}), 400
        
        result = insert_therapy_sell(data)
        if "error" in result:
            return jsonify(result), 400
        return jsonify(result), 201
    except Exception as e:
        print(f"新增療程銷售失敗: {e}")
        return jsonify({"error": str(e)}), 500

@therapy_sell.route('/sales/<int:sale_id>', methods=['PUT'])
@auth_required
def update_sale(sale_id):
    """更新療程銷售紀錄"""
    try:
        data = request.get_json() or {}

        user = get_user_from_token(request)
        if user:
            if user.get('store_id') and not data.get('storeId'):
                data['storeId'] = user.get('store_id')
            if user.get('staff_id') and not data.get('staffId'):
                data['staffId'] = user.get('staff_id')

        result = update_therapy_sell(sale_id, data)
        if "error" in result:
            return jsonify(result), 400
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        print(f"更新療程銷售失敗: {e}")
        return jsonify({"error": str(e)}), 500

@therapy_sell.route('/sales/<int:sale_id>', methods=['DELETE'])
@auth_required
def delete_sale(sale_id):
    """刪除療程銷售紀錄"""
    try:
        result = delete_therapy_sell(sale_id)
        if "error" in result:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        print(f"刪除療程銷售失敗: {e}")
        return jsonify({"error": str(e)}), 500

@therapy_sell.route('/sales/export', methods=['GET'])
@auth_required
def export_sales():
    """匯出療程銷售紀錄"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id

        is_admin = user_store_level == '總店' or request.permission == 'admin'

        store_id_param = request.args.get('store_id')
        target_store = store_id_param if is_admin else user_store_id

        sales = get_all_therapy_sells(target_store)
        
        # 檢查是否有銷售記錄
        if not sales or (isinstance(sales, dict) and "error" in sales):
            # 如果沒有銷售記錄或發生錯誤，創建一個空的DataFrame
            df = pd.DataFrame(columns=[
                'Order_ID', 'MemberName', 'PurchaseDate', 'PackageName', 
                'Sessions', 'PaymentMethod', 'StaffName', 'store_name', 'note'
            ])
        else:
            # 創建 DataFrame
            df = pd.DataFrame(sales)
            
            # 確保所有必要的列都存在
            required_columns = [
                'Order_ID', 'MemberName', 'PurchaseDate', 'PackageName', 
                'Sessions', 'PaymentMethod', 'StaffName', 'store_name', 'note'
            ]
            
            # 添加缺失的列
            for column in required_columns:
                if column not in df.columns:
                    df[column] = ''
            
            # 只選擇需要的列
            df = df[required_columns]
        
        # 重命名列為中文
        column_mapping = {
            'Order_ID': '訂單編號',
            'MemberName': '會員姓名',
            'PurchaseDate': '購買日期',
            'PackageName': '療程名稱',
            'Sessions': '金額',
            'PaymentMethod': '付款方式',
            'StaffName': '銷售人員',
            'store_name': '店鋪名稱',
            'note': '備註'
        }
        df = df.rename(columns=column_mapping)
        
        # 寫入 Excel 文件
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='療程銷售紀錄')
            
            # 自動調整列寬
            worksheet = writer.sheets['療程銷售紀錄']
            for i, col in enumerate(df.columns):
                # 計算列最大寬度
                max_len = max(
                    df[col].astype(str).map(len).max() if not df.empty else 0,
                    len(col)
                ) + 2
                worksheet.set_column(i, i, max_len)
        
        output.seek(0)
        
        # 設置文件名（使用當前日期）
        current_date = datetime.now().strftime("%Y%m%d")
        filename = f"therapy_sells_{current_date}.xlsx"
        
        return send_file(
            output, 
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        print(f"匯出療程銷售失敗: {e}")
        return jsonify({"error": str(e)}), 500

@therapy_sell.route('/members', methods=['GET'])
def get_members():
    """獲取所有會員"""
    try:
        result = get_all_members()
        return jsonify(result)
    except Exception as e:
        print(f"獲取會員列表失敗: {e}")
        return jsonify({"error": str(e)}), 500

@therapy_sell.route('/staff', methods=['GET'])
@auth_required
def get_staff():
    """依據分店取得員工"""
    try:
        store_id = request.args.get('store_id')
        result = get_all_staff(store_id)
        return jsonify(result)
    except Exception as e:
        print(f"獲取員工列表失敗: {e}")
        return jsonify({"error": str(e)}), 500

@therapy_sell.route('/stores', methods=['GET'])
def get_stores():
    """獲取所有店鋪"""
    try:
        result = get_all_stores()
        return jsonify(result)
    except Exception as e:
        print(f"獲取店鋪列表失敗: {e}")
        return jsonify({"error": str(e)}), 500 

@therapy_sell.route("/remaining-sessions", methods=["GET"])
@auth_required
def remaining_sessions_route():
    """根據會員ID和療程ID，查詢剩餘堂數"""
    member_id = request.args.get("member_id")
    therapy_id = request.args.get("therapy_id")

    if not member_id or not therapy_id:
        return jsonify({"error": "缺少 member_id 或 therapy_id 參數"}), 400
    
    try:
        # get_remaining_sessions 現在回傳一個純數字
        remaining_count = get_remaining_sessions(member_id, therapy_id)
        # 我們將數字包裝成 JSON 物件再回傳給前端
        return jsonify({"remaining_sessions": remaining_count})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"查詢剩餘堂數時發生錯誤: {str(e)}"}), 500


@therapy_sell.route("/remaining-sessions/bulk", methods=["POST"])
@auth_required
def remaining_sessions_bulk_route():
    """Fetch remaining sessions for all therapy packages of a member."""
    data = request.get_json() or {}
    member_id = data.get("member_id")

    if not member_id:
        return jsonify({"error": "member_id 為必填"}), 400

    try:
        result = get_remaining_sessions_bulk(member_id)
        return jsonify({"data": result})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"批次查詢剩餘堂數時發生錯誤: {str(e)}"}), 500