from flask import Blueprint, request, jsonify
from app.models.therapy_bundle_model import (
    get_all_therapy_bundles, create_therapy_bundle,
    get_bundle_details_by_id, update_therapy_bundle, delete_therapy_bundle
)
from app.middleware import admin_required, auth_required, get_user_from_token

therapy_bundle_bp = Blueprint(
    "therapy_bundle",
    __name__
)


@therapy_bundle_bp.route("/", methods=["GET"])
@admin_required
def get_bundles():
    """獲取療程組合列表"""
    try:
        status = request.args.get("status")
        # 總店或 admin 權限可以取得所有療程組合，不限制分店
        store_level = request.headers.get('X-Store-Level')
        store_id_header = request.headers.get('X-Store-ID')

        store_id = None
        if store_level not in ["總店", "admin"] and store_id_header:
            try:
                store_id = int(store_id_header)
            except (TypeError, ValueError):
                store_id = None

        bundles = get_all_therapy_bundles(status, store_id)
        return jsonify(bundles)
    except Exception as e:
        print(f"Error fetching therapy bundles: {e}")
        return jsonify({"error": "無法獲取療程組合列表"}), 500


@therapy_bundle_bp.route("/", methods=["POST"])
@admin_required
def add_bundle():
    """新增一個療程組合"""
    data = request.json

    if not all(k in data for k in ['bundle_code', 'name', 'selling_price']):
        return jsonify({"error": "缺少必要欄位：編號、名稱、售價"}), 400

    try:
        bundle_id = create_therapy_bundle(data)
        return jsonify({
            "message": "療程組合新增成功",
            "bundle_id": bundle_id
        }), 201
    except Exception as e:
        print(f"Error creating therapy bundle: {e}")
        if "Duplicate entry" in str(e):
            return jsonify({"error": f"組合編號 '{data['bundle_code']}' 已存在，請使用不同的編號"}), 409
        return jsonify({"error": "伺服器內部錯誤，無法新增組合"}), 500


@therapy_bundle_bp.route("/<int:bundle_id>", methods=["GET"])
@admin_required
def get_single_bundle(bundle_id):
    """獲取單一療程組合的詳細資料"""
    try:
        bundle = get_bundle_details_by_id(bundle_id)
        if bundle is None:
            return jsonify({"error": "找不到指定的療程組合"}), 404
        return jsonify(bundle)
    except Exception as e:
        return jsonify({"error": "伺服器錯誤"}), 500


@therapy_bundle_bp.route("/<int:bundle_id>", methods=["PUT"])
@admin_required
def update_single_bundle(bundle_id):
    """更新一個療程組合"""
    data = request.json
    try:
        success = update_therapy_bundle(bundle_id, data)
        if success:
            return jsonify({"message": "療程組合更新成功"})
        else:
            return jsonify({"error": "更新失敗"}), 400
    except Exception as e:
        return jsonify({"error": f"伺服器錯誤: {e}"}), 500


@therapy_bundle_bp.route("/<int:bundle_id>", methods=["DELETE"])
@admin_required
def delete_single_bundle(bundle_id):
    """刪除一個療程組合"""
    try:
        success = delete_therapy_bundle(bundle_id)
        if success:
            return jsonify({"message": "療程組合刪除成功"})
        else:
            return jsonify({"error": "刪除失敗"}), 400
    except Exception as e:
        return jsonify({"error": f"伺服器錯誤: {e}"}), 500


@therapy_bundle_bp.route("/available", methods=["GET"])
@auth_required
def get_available_therapy_bundles():
    """根據店家權限取得可用的療程組合列表"""
    try:
        user = get_user_from_token(request)
        store_id = user.get('store_id') if user and user.get('permission') != 'admin' else None
        bundles = get_all_therapy_bundles(status="PUBLISHED", store_id=store_id)
        return jsonify(bundles)
    except Exception as e:
        print(f"Error fetching available therapy bundles: {e}")
        return jsonify({"error": "無法獲取療程組合列表"}), 500
