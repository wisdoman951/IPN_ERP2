from flask import Blueprint, request, jsonify
from app.models.item_model import publish_item, unpublish_item
from app.middleware import admin_required

items_bp = Blueprint("items", __name__)

@items_bp.route("/<item_type>/<int:item_id>/publish", methods=["PATCH"])
@admin_required
def publish_route(item_type, item_id):
    try:
        publish_item(item_type, item_id)
        return jsonify({"message": "上架成功"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@items_bp.route("/<item_type>/<int:item_id>/unpublish", methods=["PATCH"])
@admin_required
def unpublish_route(item_type, item_id):
    data = request.json or {}
    reason = data.get("reason")
    try:
        unpublish_item(item_type, item_id, reason)
        return jsonify({"message": "下架成功"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
