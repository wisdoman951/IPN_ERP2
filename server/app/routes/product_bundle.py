# server/app/routes/product_bundle.py

from flask import Blueprint, request, jsonify
from app.models.product_bundle_model import (
    get_all_product_bundles, create_product_bundle, 
    get_bundle_details_by_id, update_product_bundle, delete_product_bundle
)
from app.middleware import admin_required, auth_required, get_user_from_token

# Blueprint 的建立方式不變
product_bundle_bp = Blueprint(
    "product_bundle", 
    __name__
)

@product_bundle_bp.route("/", methods=["GET"])
@admin_required
def get_bundles():
    """獲取產品組合列表"""
    try:
        status = request.args.get("status")
        # 總店或具備 admin 權限的使用者應能查看所有組合，不受門市限制
        store_level = request.headers.get('X-Store-Level')
        store_id_header = request.headers.get('X-Store-ID')

        store_id = None
        if store_level not in ["總店", "admin"] and store_id_header:
            try:
                store_id = int(store_id_header)
            except (TypeError, ValueError):
                store_id = None

        bundles = get_all_product_bundles(status, store_id)
        return jsonify(bundles)
    except Exception as e:
        print(f"Error fetching product bundles: {e}")
        return jsonify({"error": "無法獲取產品組合列表"}), 500


@product_bundle_bp.route("/available", methods=["GET"])
@auth_required
def get_available_bundles():
    """根據店家權限取得可用的產品組合列表"""
    try:
        user = get_user_from_token(request)
        store_id = user.get('store_id') if user and user.get('permission') != 'admin' else None
        bundles = get_all_product_bundles(status="PUBLISHED", store_id=store_id)
        return jsonify(bundles)
    except Exception as e:
        print(f"Error fetching available product bundles: {e}")
        return jsonify({"error": "無法獲取產品組合列表"}), 500

@product_bundle_bp.route("/", methods=["POST"])
@admin_required
def add_bundle():
    """新增一個產品組合"""
    data = request.json
    
    if not all(k in data for k in ['bundle_code', 'name', 'selling_price']):
        return jsonify({"error": "缺少必要欄位：編號、名稱、售價"}), 400

    try:
        bundle_id = create_product_bundle(data)
        return jsonify({
            "message": "產品組合新增成功", 
            "bundle_id": bundle_id
        }), 201
    except Exception as e:
        print(f"Error creating product bundle: {e}")
        if "Duplicate entry" in str(e):
             return jsonify({"error": f"組合編號 '{data['bundle_code']}' 已存在，請使用不同的編號"}), 409
        return jsonify({"error": "伺服器內部錯誤，無法新增組合"}), 500

@product_bundle_bp.route("/<int:bundle_id>", methods=["GET"])
@admin_required
def get_single_bundle(bundle_id):
    """API 端點：獲取單一組合的詳細資料"""
    try:
        bundle = get_bundle_details_by_id(bundle_id)
        if bundle is None:
            return jsonify({"error": "找不到指定的產品組合"}), 404
        return jsonify(bundle)
    except Exception as e:
        return jsonify({"error": "伺服器錯誤"}), 500

@product_bundle_bp.route("/<int:bundle_id>", methods=["PUT"])
@admin_required
def update_single_bundle(bundle_id):
    """API 端點：更新一個產品組合"""
    data = request.json
    try:
        success = update_product_bundle(bundle_id, data)
        if success:
            return jsonify({"message": "產品組合更新成功"})
        else:
            return jsonify({"error": "更新失敗"}), 400
    except Exception as e:
        return jsonify({"error": f"伺服器錯誤: {e}"}), 500

@product_bundle_bp.route("/<int:bundle_id>", methods=["DELETE"])
@admin_required
def delete_single_bundle(bundle_id):
    """API 端點：刪除一個產品組合"""
    try:
        success = delete_product_bundle(bundle_id)
        if success:
            return jsonify({"message": "產品組合刪除成功"})
        else:
            return jsonify({"error": "刪除失敗"}), 400
    except Exception as e:
        return jsonify({"error": f"伺服器錯誤: {e}"}), 500
