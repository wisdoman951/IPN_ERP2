from flask import Blueprint, request, jsonify, send_file
import pandas as pd
import io
from app.models.staff_model import (
    get_all_staff,
    search_staff,
    get_staff_by_id,
    get_staff_by_ids,
    create_staff,
    update_staff,
    delete_staff,
    get_permission_list,
    get_staff_details,
    get_all_staff_for_dropdown,
    search_staff_with_accounts,
    get_all_staff_with_accounts,
    update_staff_account,
    get_staff_by_store_for_dropdown,
    get_all_stores,
    get_all_stores_for_dropdown
)
from app.middleware import auth_required, login_required, admin_required
staff_bp = Blueprint("staff", __name__)


def _forbid_therapist():
    if getattr(request, 'permission', None) == 'therapist':
        return jsonify({"error": "無操作權限"}), 403
    return None

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

        # 非管理員一律以自身 store_id 為準，避免任意查看其他分店
        target_store = store_id_param if is_admin else user_store_id
        staff_list = get_all_staff(user_store_level, target_store)
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
        denial = _forbid_therapist()
        if denial:
            return denial
        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        store_id_param = request.args.get('store_id')

        # 分店用戶只准查詢自身分店
        target_store = store_id_param if is_admin else user_store_id

        staff_list = search_staff(keyword, user_store_level, target_store)
        return jsonify(staff_list)
    except Exception as e:
        print(f"搜尋員工失敗: {e}")
        return jsonify({"error": str(e)}), 500

@staff_bp.route("/<int:staff_id>", methods=["GET"])
@auth_required
def get_staff_route(staff_id):
    """獲取單個員工信息"""
    try:
        denial = _forbid_therapist()
        if denial:
            return denial
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
        denial = _forbid_therapist()
        if denial:
            return denial
        details = get_staff_details(staff_id)
        if not details:
            return jsonify({"error": "找不到該員工的詳細資料"}), 404
        return jsonify(details)
    except Exception as e:
        print(f"獲取員工詳細資料失敗: {e}")
        return jsonify({"error": str(e)}), 500

@staff_bp.route("/export", methods=["GET"])
@auth_required
def export_staff_route():
    """匯出員工資料為 Excel 檔案"""
    try:
        denial = _forbid_therapist()
        if denial:
            return denial
        user_store_level = request.store_level
        user_store_id = request.store_id
        is_admin = user_store_level == '總店' or request.permission == 'admin'
        store_id_param = request.args.get('store_id', type=int)

        # 總店若未指定 store_id，匯出所有分店的員工；分店僅匯出自身員工
        target_store = store_id_param if is_admin else user_store_id

        staff_list = get_all_staff(user_store_level, target_store)
        if not staff_list:
            return jsonify({"message": "沒有可匯出的員工資料。"}), 404

        # 僅輸出指定欄位，並將欄位名稱轉為中文
        columns = [
            'staff_id', 'family_information_id', 'emergency_contact_id',
            'work_experience_id', 'hiring_information_id', 'name', 'gender',
            'fill_date', 'onboard_date', 'nationality', 'education', 'married',
            'position', 'phone', 'national_id', 'mailing_address',
            'registered_address', 'account', 'password', 'permission', 'store_id',
            'store_name'
        ]

        column_mapping = {
            'staff_id': '員工編號',
            'family_information_id': '家庭資料ID',
            'emergency_contact_id': '緊急聯絡人ID',
            'work_experience_id': '工作經驗ID',
            'hiring_information_id': '雇用資訊ID',
            'name': '姓名',
            'gender': '性別',
            'fill_date': '填表日期',
            'onboard_date': '到職日期',
            'nationality': '國籍',
            'education': '教育程度',
            'married': '婚姻狀況',
            'position': '職位',
            'phone': '電話',
            'national_id': '身分證',
            'mailing_address': '通訊地址',
            'registered_address': '戶籍地址',
            'account': '帳號',
            'password': '密碼',
            'permission': '權限',
            'store_id': '分店ID',
            'store_name': '店別'
        }

        df = pd.DataFrame(staff_list)
        for col in columns:
            if col not in df.columns:
                df[col] = None
        df = df[columns]
        df = df.rename(columns=column_mapping)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='員工資料')
            workbook = writer.book
            worksheet = writer.sheets['員工資料']
            header_format = workbook.add_format({'bold': True, 'bg_color': '#D9EAD3', 'border': 1})
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            for i, col in enumerate(df.columns):
                column_width = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.set_column(i, i, column_width)
        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='員工資料.xlsx'
        )
    except Exception as e:
        print(f"匯出員工資料失敗: {e}")
        return jsonify({'error': str(e)}), 500

@staff_bp.route("/export-selected", methods=["POST"])
@auth_required
def export_selected_staff_route():
    """匯出勾選的員工資料為 Excel 檔案"""
    try:
        denial = _forbid_therapist()
        if denial:
            return denial
        data = request.json or {}
        ids = data.get('ids')
        if not ids or not isinstance(ids, list):
            return jsonify({'error': '請提供要匯出的員工 ID 列表'}), 400

        staff_list = get_staff_by_ids(ids)
        if not staff_list:
            return jsonify({'message': '沒有可匯出的員工資料。'}), 404

        columns = [
            'staff_id', 'family_information_id', 'emergency_contact_id',
            'work_experience_id', 'hiring_information_id', 'name', 'gender',
            'fill_date', 'onboard_date', 'nationality', 'education', 'married',
            'position', 'phone', 'national_id', 'mailing_address',
            'registered_address', 'account', 'password', 'permission', 'store_id'
        ]

        column_mapping = {
            'staff_id': '員工編號',
            'family_information_id': '家庭資料ID',
            'emergency_contact_id': '緊急聯絡人ID',
            'work_experience_id': '工作經驗ID',
            'hiring_information_id': '雇用資訊ID',
            'name': '姓名',
            'gender': '性別',
            'fill_date': '填表日期',
            'onboard_date': '到職日期',
            'nationality': '國籍',
            'education': '教育程度',
            'married': '婚姻狀況',
            'position': '職位',
            'phone': '電話',
            'national_id': '身分證',
            'mailing_address': '通訊地址',
            'registered_address': '戶籍地址',
            'account': '帳號',
            'password': '密碼',
            'permission': '權限',
            'store_id': '分店ID'
        }

        df = pd.DataFrame(staff_list)
        for col in columns:
            if col not in df.columns:
                df[col] = None
        df = df[columns].rename(columns=column_mapping)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='員工資料')
            workbook = writer.book
            worksheet = writer.sheets['員工資料']
            header_format = workbook.add_format({'bold': True, 'bg_color': '#D9EAD3', 'border': 1})
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            for i, col in enumerate(df.columns):
                column_width = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.set_column(i, i, column_width)
        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='員工資料.xlsx'
        )
    except Exception as e:
        print(f"匯出員工資料失敗: {e}")
        return jsonify({'error': str(e)}), 500

@staff_bp.route("/add", methods=["POST"])
@auth_required
def add_staff():
    """新增員工"""
    data = request.json
    try:
        denial = _forbid_therapist()
        if denial:
            return denial
        basic_info = data.get("basic_info", {}) if data else {}
        if basic_info.get("store_id") is None:
            return jsonify({"error": "所屬分店為必填"}), 400
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
        denial = _forbid_therapist()
        if denial:
            return denial
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
        if getattr(request, 'permission', None) != 'admin':
            return jsonify({"error": "無操作權限"}), 403
        success = delete_staff(staff_id)
        if success:
            return jsonify({"message": "員工刪除成功"}), 200
        else:
            return jsonify({"error": "員工刪除失敗"}), 400
    except Exception as e:
        print(f"刪除員工失敗: {e}")
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
        # 將資料庫的 reset_requested 轉為布林值
        for staff in staff_list:
            staff["reset_requested"] = bool(staff.get("reset_requested"))
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
        # 處理帳號重複的錯誤，避免回傳資料庫明碼
        error_message = str(e)
        if "Duplicate entry" in error_message and "account" in error_message:
            return jsonify({"error": "使用者帳號重複"}), 400
        return jsonify({"error": error_message}), 500


# 總部專用：匯出員工帳號資料
@staff_bp.route("/accounts/export", methods=["GET"])
@admin_required
def export_staff_accounts_route():
    """匯出所有員工帳號資料為 Excel"""
    try:
        keyword = request.args.get("keyword")
        if keyword:
            staff_list = search_staff_with_accounts(keyword)
        else:
            staff_list = get_all_staff_with_accounts()

        if not staff_list:
            return jsonify({"message": "沒有可匯出的員工帳號資料。"}), 404

        columns = [
            "staff_id", "name", "phone", "store_name",
            "account", "password", "permission", "reset_requested"
        ]
        column_mapping = {
            "staff_id": "員工編號",
            "name": "姓名",
            "phone": "電話",
            "store_name": "店別",
            "account": "帳號",
            "password": "密碼",
            "permission": "權限",
            "reset_requested": "申請重設"
        }

        df = pd.DataFrame(staff_list)
        for col in columns:
            if col not in df.columns:
                df[col] = None
        df = df[columns].rename(columns=column_mapping)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
            df.to_excel(writer, index=False, sheet_name="帳號資料")
            workbook = writer.book
            worksheet = writer.sheets["帳號資料"]
            header_format = workbook.add_format({"bold": True, "bg_color": "#D9EAD3", "border": 1})
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            for i, col in enumerate(df.columns):
                column_width = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.set_column(i, i, column_width)
        output.seek(0)

        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="員工帳號資料.xlsx",
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 總部專用：匯出勾選的員工帳號資料
@staff_bp.route("/accounts/export-selected", methods=["POST"])
@admin_required
def export_selected_staff_accounts_route():
    """匯出勾選的員工帳號資料為 Excel"""
    try:
        data = request.json or {}
        ids = data.get("ids")
        if not ids or not isinstance(ids, list):
            return jsonify({"error": "請提供要匯出的員工 ID 列表"}), 400

        staff_list = get_all_staff_with_accounts()
        staff_list = [s for s in staff_list if s.get("staff_id") in ids]
        if not staff_list:
            return jsonify({"message": "沒有可匯出的員工帳號資料。"}), 404

        columns = [
            "staff_id", "name", "phone", "store_name",
            "account", "password", "permission", "reset_requested"
        ]
        column_mapping = {
            "staff_id": "員工編號",
            "name": "姓名",
            "phone": "電話",
            "store_name": "店別",
            "account": "帳號",
            "password": "密碼",
            "permission": "權限",
            "reset_requested": "申請重設"
        }

        df = pd.DataFrame(staff_list)
        for col in columns:
            if col not in df.columns:
                df[col] = None
        df = df[columns].rename(columns=column_mapping)

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
            df.to_excel(writer, index=False, sheet_name="帳號資料")
            workbook = writer.book
            worksheet = writer.sheets["帳號資料"]
            header_format = workbook.add_format({"bold": True, "bg_color": "#D9EAD3", "border": 1})
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            for i, col in enumerate(df.columns):
                column_width = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.set_column(i, i, column_width)
        output.seek(0)

        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="員工帳號資料.xlsx",
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 總部專用：獲取所有分店列表，用於下拉式選單
@staff_bp.route("/stores", methods=["GET"])
@login_required  # 使用 login_required 即可，因為分店和總部可能都需要這個列表
def get_stores():
    """提供給前端下拉式選單所需要的所有分店列表。"""
    try:
        stores = get_all_stores()
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
