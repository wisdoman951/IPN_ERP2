from flask import Blueprint, request, jsonify
from app.models.staff_model import (
    get_all_staff,
    search_staff,
    get_staff_by_id,
    create_staff,
    update_staff,
    delete_staff,
    get_store_list,
    get_permission_list,
    get_staff_details,
    get_all_staff_for_dropdown,
    search_staff_with_accounts,
    get_all_staff_with_accounts,
    update_staff_account,
    get_staff_by_store_for_dropdown,
    get_all_stores_for_dropdown
)
from app.middleware import auth_required, login_required, admin_required
staff_bp = Blueprint("staff", __name__)

# --- 這個是您原有的，用於獲取完整員工列表 ---
@staff_bp.route("/list", methods=["GET"])
@auth_required
def get_staff_list():
    """根據權限獲取員工列表"""
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        store_id_param = request.args.get('store_id')
        target_store = None if is_admin and not store_id_param else (store_id_param or user_store_id)

        staff_list = get_all_staff(target_store)
        return jsonify(staff_list)
    except Exception as e:
        print(f"獲取員工列表失敗: {e}")
        return jsonify({"error": str(e)}), 500

# --- vvvv 我們新增這個專門給下拉選單用的新路由 vvvv ---
@staff_bp.route("/for-dropdown", methods=["GET"])
@login_required
def get_staff_for_dropdown_route():
    """提供給前端下拉選單使用的員工列表 (僅含id和name)"""
    try:
        staff_list = get_all_staff_for_dropdown()
        return jsonify(staff_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@staff_bp.route("/search", methods=["GET"])
@auth_required
def search_staff_route():
    """搜尋員工"""
    keyword = request.args.get("keyword", "")
    try:
        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        store_id_param = request.args.get('store_id')
        target_store = None if is_admin and not store_id_param else (store_id_param or user_store_id)

        staff_list = search_staff(keyword, target_store)
        return jsonify(staff_list)
    except Exception as e:
        print(f"搜尋員工失敗: {e}")
        return jsonify({"error": str(e)}), 500

@staff_bp.route("/<int:staff_id>", methods=["GET"])
@auth_required
def get_staff_route(staff_id):
    """獲取單個員工信息"""
    try:
        staff = get_staff_by_id(staff_id)
        if not staff:
            return jsonify({"error": "找不到該員工"}), 404
        return jsonify(staff)
    except Exception as e:
        print(f"獲取員工信息失敗: {e}")
        return jsonify({"error": str(e)}), 500

@staff_bp.route("/details/<int:staff_id>", methods=["GET"])
@auth_required
def get_staff_details_route(staff_id):
    """獲取員工詳細資料"""
    try:
        details = get_staff_details(staff_id)
        if not details:
            return jsonify({"error": "找不到該員工的詳細資料"}), 404
        return jsonify(details)
    except Exception as e:
        print(f"獲取員工詳細資料失敗: {e}")
        return jsonify({"error": str(e)}), 500

@staff_bp.route("/add", methods=["POST"])
@auth_required
def add_staff():
    """新增員工"""
    data = request.json
    try:
        staff_id = create_staff(data)
        if staff_id:
            return jsonify({"message": "員工新增成功", "staff_id": staff_id}), 201
        else:
            return jsonify({"error": "員工新增失敗"}), 400
    except Exception as e:
        print(f"新增員工失敗: {e}")
        return jsonify({"error": str(e)}), 500

@staff_bp.route("/update/<int:staff_id>", methods=["PUT"])
@auth_required
def update_staff_route(staff_id):
    """更新員工信息"""
    data = request.json
    try:
        success = update_staff(staff_id, data)
        if success:
            return jsonify({"message": "員工信息更新成功"}), 200
        else:
            return jsonify({"error": "員工信息更新失敗"}), 400
    except Exception as e:
        print(f"更新員工信息失敗: {e}")
        return jsonify({"error": str(e)}), 500

@staff_bp.route("/delete/<int:staff_id>", methods=["DELETE"])
@auth_required
def delete_staff_route(staff_id):
    """刪除員工"""
    try:
        success = delete_staff(staff_id)
        if success:
            return jsonify({"message": "員工刪除成功"}), 200
        else:
            return jsonify({"error": "員工刪除失敗"}), 400
    except Exception as e:
        print(f"刪除員工失敗: {e}")
        return jsonify({"error": str(e)}), 500

@staff_bp.route("/stores", methods=["GET"])
def get_stores():
    """獲取所有分店"""
    try:
        stores = get_store_list()
        return jsonify(stores)
    except Exception as e:
        print(f"獲取分店列表失敗: {e}")
        return jsonify({"error": str(e)}), 500

@staff_bp.route("/permissions", methods=["GET"])
def get_permissions():
    """獲取所有權限等級"""
    try:
        permissions = get_permission_list()
        return jsonify(permissions)
    except Exception as e:
        print(f"獲取權限列表失敗: {e}")
        return jsonify({"error": str(e)}), 500 

# 總部專用：獲取所有員工帳號列表
@staff_bp.route("/accounts", methods=["GET"])
@admin_required # 確保只有總部管理員能存取
def get_staff_accounts():
    try:
        keyword = request.args.get("keyword")
        if keyword:
            staff_list = search_staff_with_accounts(keyword)
        else:
            staff_list = get_all_staff_with_accounts()
        return jsonify(staff_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 總部專用：更新員工帳號資訊
@staff_bp.route("/account/<int:staff_id>", methods=["PUT"])
@admin_required
def update_account_route(staff_id):
    data = request.json
    try:
        success = update_staff_account(staff_id, data)
        if success:
            return jsonify({"message": "員工帳號更新成功"}), 200
        else:
            return jsonify({"error": "更新失敗或無此員工"}), 404
    except Exception as e:
        # 處理帳號重複的錯誤
        if "Duplicate entry" in str(e) and "for key 'account'" in str(e):
             return jsonify({"error": f"帳號 '{data.get('account')}' 已被使用，請更換一個。"}), 400
        return jsonify({"error": str(e)}), 500


# 總部專用：獲取所有分店列表，用於下拉式選單
@staff_bp.route("/stores", methods=["GET"])
@login_required # 使用 login_required 即可，因為分店和總部可能都需要這個列表
def get_all_stores_route():
    """
    提供給前端下拉式選單所需要的所有分店列表。
    """
    try:
        stores = get_all_stores()
        print(stores)
        return jsonify(stores)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- 專門為分店下拉選單新增的 API 路由 ---
@staff_bp.route("/stores-for-dropdown", methods=["GET"])
@login_required # 使用最基本的登入驗證即可
def get_stores_for_dropdown_route():
    """
    [新功能專用] 提供給前端分店下拉選單的 API。
    """
    try:
        stores = get_all_stores_for_dropdown()
        return jsonify(stores)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- [新功能專用] 提供給前端的 API，用來獲取指定分店的員工列表 ---
@staff_bp.route("/by-store/<int:store_id>", methods=["GET"])
@admin_required # 確保只有總部管理員能使用
def get_staff_by_store_route(store_id):
    """
    根據前端傳來的 store_id，回傳該分店的員工列表。
    """
    try:
        staff_list = get_staff_by_store_for_dropdown(store_id)
        print(staff_list)
        return jsonify(staff_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500