from flask import Blueprint, request, jsonify
from app.models.category_model import create_category, get_categories, delete_category
from app.middleware import admin_required, auth_required

category_bp = Blueprint("category", __name__)


@category_bp.route("/", methods=["GET"])
@auth_required
def list_categories():
    target_type = request.args.get("target_type")
    try:
        categories = get_categories(target_type)
        return jsonify(categories)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@category_bp.route("/", methods=["POST"])
@admin_required
def add_category():
    data = request.json or {}
    name = data.get("name")
    target_type = data.get("target_type")
    if not name or not target_type:
        return jsonify({"error": "缺少必要欄位"}), 400
    try:
        category_id = create_category(name, target_type)
        return jsonify({"message": "分類新增成功", "category_id": category_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@category_bp.route("/<int:category_id>", methods=["DELETE"])
@admin_required
def remove_category(category_id: int):
    try:
        delete_category(category_id)
        return jsonify({"message": "分類刪除成功"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
