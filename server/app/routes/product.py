from flask import Blueprint, request, jsonify
from app.models.product_model import (
    create_product,
    delete_product,
    find_products_with_prefix,
    update_product,
)
from app.middleware import admin_required

product_bp = Blueprint("product", __name__)

@product_bp.route("/", methods=["POST"])
@admin_required
def add_product():
    data = request.json or {}
    code = (data.get("code") or "").strip()
    name = (data.get("name") or "").strip()
    force_create = bool(data.get("force_create"))

    if not code or not name:
        return jsonify({"error": "缺少必要欄位"}), 400

    code_prefix = code[:5]
    conflicts = []
    if code_prefix:
        existing = find_products_with_prefix(code_prefix)
        conflicts = [
            {
                "product_id": product.get("product_id"),
                "name": product.get("name"),
                "code": product.get("code"),
            }
            for product in existing
            if (product.get("name") or "").strip().lower() != name.lower()
        ]

    if conflicts and not force_create:
        return (
            jsonify(
                {
                    "error": "偵測到產品編號前綴與其他商品相同，請確認是否為同一商品。",
                    "requires_confirmation": True,
                    "conflicts": conflicts,
                    "code_prefix": code_prefix,
                }
            ),
            409,
        )

    try:
        product_id = create_product(data)
        return jsonify({"message": "產品新增成功", "product_id": product_id}), 201
    except Exception as e:
        if "Duplicate entry" in str(e):
            return jsonify({"error": "產品編號重複"}), 409
        return jsonify({"error": str(e)}), 500


@product_bp.route("/<int:product_id>", methods=["PUT"])
@admin_required
def update_product_route(product_id):
    data = request.json
    try:
        update_product(product_id, data)
        return jsonify({"message": "產品更新成功"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@product_bp.route("/<int:product_id>", methods=["DELETE"])
@admin_required
def delete_product_route(product_id):
    try:
        delete_product(product_id)
        return jsonify({"message": "產品刪除成功"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
