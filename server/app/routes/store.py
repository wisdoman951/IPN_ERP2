import pymysql
from flask import Blueprint, request, jsonify
from app.models.store_model import create_store, get_all_stores, VALID_STORE_TYPES
from app.middleware import admin_required

# 建立一個新的 Blueprint
store_bp = Blueprint("store", __name__)

@store_bp.route("/list", methods=["GET"])
@admin_required
def get_stores_list():
    """
    API 端點：獲取所有分店的列表
    """
    try:
        stores = get_all_stores()
        return jsonify(stores)
    except Exception as e:
        print(f"獲取分店列表時發生錯誤: {e}")
        return jsonify({"error": "伺服器內部錯誤，無法獲取分店列表"}), 500


# ... (@store_bp.route("/add") 這個路由維持不變) ...
@store_bp.route("/add", methods=["POST"])
@admin_required
def add_new_store():
    """
    API 端點：新增一間分店
    """
    # ... (此函式內容維持不變)
    data = request.json or {}
    required_fields = ['store_name', 'account', 'password']
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"error": "分店名稱、帳號和密碼為必填欄位"}), 400

    store_type = data.get('store_type', 'DIRECT')
    store_type = store_type.upper() if isinstance(store_type, str) else 'DIRECT'
    if store_type not in VALID_STORE_TYPES:
        return jsonify({"error": "store_type 僅能為 DIRECT 或 FRANCHISE"}), 400
    data['store_type'] = store_type

    try:
        store_id = create_store(data)
        return jsonify({
            "message": "分店新增成功",
            "store_id": store_id
        }), 201
    except pymysql.err.IntegrityError as e:
        if 'UNIQUE' in str(e) and 'account' in str(e):
            return jsonify({"error": f"登入帳號 '{data['account']}' 已被使用，請更換一個"}), 409
        return jsonify({"error": f"資料庫錯誤: {e}"}), 500
    except Exception as e:
        print(f"新增分店時發生錯誤: {e}")
        return jsonify({"error": "伺服器內部錯誤，無法新增分店"}), 500