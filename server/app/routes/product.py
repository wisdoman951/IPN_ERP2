from flask import Blueprint, request, jsonify
from app.models.product_model import insert_product
from app.middleware import admin_required

product_bp = Blueprint("product", __name__)

@product_bp.route("/", methods=["POST"])
@admin_required
def create_product_route():
    data = request.json
    if not all(k in data for k in ["code", "name", "price"]):
        return jsonify({"error": "缺少必要欄位"}), 400
    try:
        product_id = insert_product(data)
        return jsonify({"message": "新增成功", "product_id": product_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
