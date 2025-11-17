from flask import Blueprint, request, jsonify, send_file
import pandas as pd
import io
from datetime import datetime
import json

from app.models.inventory_model import (
    get_all_inventory,
    search_inventory,
    get_inventory_by_id,
    update_inventory_item,
    add_inventory_item,
    delete_inventory_item,
    get_low_stock_inventory,
    get_product_list,
    export_inventory_data,
    get_inventory_history,
)

from app.models.master_stock_model import (
    list_master_products_for_inbound,
    list_variants_for_outbound,
    list_master_stock_summary,
    list_variants_for_master,
    receive_master_stock,
    ship_variant_stock,
)
from app.models.master_stock_model import (
    list_master_products_for_inbound,
    list_variants_for_outbound,
    list_master_stock_summary,
    list_variants_for_master,
    receive_master_stock,
    ship_variant_stock,
    list_master_costs,
    upsert_master_cost_price,
    VALID_STORE_TYPES,
)
from app.models.master_stock_model import (
    list_master_products_for_inbound,
    list_variants_for_outbound,
    list_master_stock_summary,
    list_variants_for_master,
    receive_master_stock,
    ship_variant_stock,
    list_master_costs,
    upsert_master_cost_price,
    VALID_STORE_TYPES,
)
from app.middleware import auth_required, get_user_from_token

inventory_bp = Blueprint("inventory", __name__)


def _safe_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

@inventory_bp.route("/list", methods=["GET"])
@auth_required
def get_inventory_list():
    """根據權限獲取庫存記錄"""
    try:
        ctx = _get_auth_context()
        store_id_param = request.args.get("store_id")

        # 管理員可選擇 store_id；分店則固定為自身
        target_store = store_id_param if ctx["is_admin"] else ctx["store_id"]

        inventory_list = get_all_inventory(target_store)
        return jsonify(inventory_list)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@inventory_bp.route("/search", methods=["GET"])
@auth_required
def search_inventory_items():
    """搜尋庫存記錄"""
    keyword = request.args.get("keyword", "")
    try:
        ctx = _get_auth_context()
        store_id_param = request.args.get("store_id")

        target_store = store_id_param if ctx["is_admin"] else ctx["store_id"]

        inventory_list = search_inventory(keyword, target_store)
        return jsonify(inventory_list)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@inventory_bp.route("/low-stock", methods=["GET"])
@auth_required
def get_low_stock_items():
    """獲取低於閾值的庫存記錄"""
    try:
        # 治療師沒有權限
        if getattr(request, "permission", None) == "therapist":
            return jsonify({"error": "無操作權限"}), 403

        ctx = _get_auth_context()
        store_id_param = request.args.get("store_id")

        target_store = store_id_param if ctx["is_admin"] else ctx["store_id"]

        inventory_list = get_low_stock_inventory(target_store)
        return jsonify(inventory_list)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@inventory_bp.route("/records", methods=["GET"])
@auth_required
def get_inventory_records():
    """取得庫存進出明細"""
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    sale_staff = request.args.get("sale_staff")
    buyer = request.args.get("buyer")
    product_id = request.args.get("product_id")
    try:
        ctx = _get_auth_context()
        store_id_param = request.args.get("store_id")

        target_store = store_id_param if ctx["is_admin"] else ctx["store_id"]

        records = get_inventory_history(
            target_store, start_date, end_date, sale_staff, buyer, product_id
        )
        return jsonify(records)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


# =========================
# 單筆庫存 CRUD
# =========================

@inventory_bp.route("/<int:inventory_id>", methods=["GET"])
@auth_required
def get_inventory_item(inventory_id):
    """根據ID獲取庫存記錄"""
    try:
        # 1000000 以上為銷售資料，不允許在此更動
        if inventory_id >= 1000000:
            return jsonify(
                {
                    "error": "銷售資料無法做更動，銷售資料要做更動請至銷售產品/銷售療程做修改"
                }
            ), 400

        inventory_item = get_inventory_by_id(inventory_id)
        if not inventory_item:
            return jsonify({"error": "找不到該庫存記錄"}), 404

        ctx = _get_auth_context()
        if not ctx["is_admin"] and inventory_item.get("Store_ID") != ctx["store_id"]:
            return jsonify({"error": "無權查看其他分店的庫存紀錄"}), 403

        return jsonify(inventory_item)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@inventory_bp.route("/update/<int:inventory_id>", methods=["PUT"])
@auth_required
def update_inventory(inventory_id):
    """更新庫存記錄"""
    data = request.json or {}
    try:
        # 治療師沒有權限
        if getattr(request, "permission", None) == "therapist":
            return jsonify({"error": "無操作權限"}), 403

        # 銷售資料不允許由此修改
        if inventory_id >= 1000000:
            return jsonify(
                {
                    "error": "銷售資料無法做更動，銷售資料要做更動請至銷售產品/銷售療程做修改"
                }
            ), 400

        existing = get_inventory_by_id(inventory_id)
        if not existing:
            return jsonify({"error": "找不到該庫存記錄"}), 404

        ctx = _get_auth_context()
        if not ctx["is_admin"] and existing.get("Store_ID") != ctx["store_id"]:
            return jsonify({"error": "無權修改其他分店的庫存紀錄"}), 403

        success = update_inventory_item(inventory_id, data)
        if success:
            return jsonify({"message": "庫存記錄更新成功", "success": True}), 200
        else:
            return jsonify({"error": "庫存記錄更新失敗"}), 400
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@inventory_bp.route("/add", methods=["POST"])
@auth_required
def add_inventory():
    """新增庫存記錄"""
    data = request.json or {}
    try:
        user_info = get_user_from_token(request)
        user_store_level = user_info.get("store_level")
        user_store_id = user_info.get("store_id")
        permission = user_info.get("permission")
        is_admin = user_store_level == "總店" or permission == "admin"

        # storeId 未帶入則預設為使用者分店；非 admin 不可為其他分店新增
        if not data.get("storeId"):
            data["storeId"] = user_store_id
        elif not is_admin and int(data.get("storeId")) != int(user_store_id):
            return jsonify({"error": "無權為其他分店新增庫存"}), 403

        # 若有 staff_id，則自動帶入
        if user_info.get("staff_id") and not data.get("staffId"):
            data["staffId"] = user_info.get("staff_id")

        success = add_inventory_item(data)
        if success:
            return jsonify({"message": "庫存記錄新增成功", "success": True}), 201
        else:
            return jsonify({"error": "庫存記錄新增失敗"}), 400
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@inventory_bp.route("/delete/<int:inventory_id>", methods=["DELETE"])
@auth_required
def delete_inventory(inventory_id):
    """刪除庫存記錄"""
    try:
        # 只有 admin 可以刪除
        if getattr(request, "permission", None) != "admin":
            return jsonify({"error": "無操作權限"}), 403

        existing = get_inventory_by_id(inventory_id)
        if not existing:
            return jsonify({"error": "找不到該庫存記錄"}), 404

        ctx = _get_auth_context()
        if not ctx["is_admin"] and existing.get("Store_ID") != ctx["store_id"]:
            return jsonify({"error": "無權刪除其他分店的庫存紀錄"}), 403

        # ---- 你漏掉的地方在這裡 ----
        success = delete_inventory_item(inventory_id)
        if success:
            return jsonify({"message": "庫存記錄刪除成功", "success": True}), 200
        else:
            return jsonify({"error": "庫存記錄刪除失敗"}), 400

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500



@inventory_bp.route("/master/products", methods=["GET"])
@auth_required
def list_master_products():
    """進貨視窗：僅顯示 master 商品，並依店型顯示成本價。"""
    keyword = request.args.get("q")
    store_type = getattr(request, 'store_type', None)
    store_id = getattr(request, 'store_id', None)
    products = list_master_products_for_inbound(store_type, store_id, keyword)
    return jsonify(products)


@inventory_bp.route("/master/outbound/variants", methods=["GET"])
@auth_required
def list_outbound_variants():
    """出貨視窗：列出所有尾碼版本供選擇。"""
    keyword = request.args.get("q")
    store_id = getattr(request, 'store_id', None)
    variants = list_variants_for_outbound(store_id, keyword)
    return jsonify(variants)


@inventory_bp.route("/master/summary", methods=["GET"])
@auth_required
def master_stock_summary():
    keyword = request.args.get("q")
    store_id_param = request.args.get("store_id")
    user_info = get_user_from_token(request)
    try:
        target_store_id, _, _ = _resolve_store_id(store_id_param, user_info)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    if not target_store_id:
        return jsonify({"error": "請提供有效的 store_id"}), 400
    try:
        summary = list_master_stock_summary(target_store_id, keyword)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(summary)


@inventory_bp.route("/master/<int:master_product_id>/variants", methods=["GET"])
@auth_required
def master_variants(master_product_id: int):
    """查詢指定 master 商品的尾碼版本明細。"""
    variants = list_variants_for_master(master_product_id)
    return jsonify(variants)


@inventory_bp.route("/master/prices", methods=["GET"])
@auth_required
def master_prices():
    if getattr(request, 'permission', None) == 'therapist':
        return jsonify({"error": "無操作權限"}), 403
    keyword = request.args.get("q")
    master_id = request.args.get("master_product_id")
    master_id_value = None
    if master_id:
        try:
            master_id_value = int(master_id)
        except (TypeError, ValueError):
            master_id_value = None
    prices = list_master_costs(keyword, master_id_value)
    return jsonify(prices)


@inventory_bp.route("/master/prices", methods=["POST"])
@auth_required
def update_master_price():
    if getattr(request, 'permission', None) == 'therapist':
        return jsonify({"error": "無操作權限"}), 403

    data = request.json or {}
    master_product_id = _safe_int(data.get('master_product_id'))
    cost_price = data.get('cost_price')
    if not master_product_id:
        return jsonify({"error": "master_product_id 為必填"}), 400

    user_info = get_user_from_token(request)
    can_override_store_type = (
        user_info.get('store_level') == '總店' or user_info.get('permission') == 'admin'
    )
    requested_store_type = data.get('store_type') if can_override_store_type else None
    store_type = requested_store_type or getattr(request, 'store_type', None) or user_info.get('store_type')
    if not store_type or store_type.upper() not in VALID_STORE_TYPES:
        store_type = 'DIRECT'

    try:
        price = upsert_master_cost_price(master_product_id, store_type, cost_price)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        print(f"[master_price_update] {exc}")
        return jsonify({"error": "進貨價更新失敗"}), 500

    summary = list_master_costs(None, master_product_id)
    detail = summary[0] if summary else price
    return jsonify({"message": "進貨價已更新", "price": price, "master": detail})


def _resolve_store_id(requested_store_id, user_info):
    user_store_id = _safe_int(user_info.get('store_id'))
    is_admin = user_info.get('store_level') == '總店' or user_info.get('permission') == 'admin'
    target_store_id = _safe_int(requested_store_id) if requested_store_id is not None else user_store_id
    if not target_store_id:
        return None, user_store_id, is_admin
    if not is_admin and user_store_id and target_store_id != user_store_id:
        raise PermissionError("無權操作其他分店的庫存")
    return target_store_id, user_store_id, is_admin


@inventory_bp.route("/master/inbound", methods=["POST"])
@auth_required
def master_stock_inbound():
    """統一進貨：直接更新 master 庫存並記錄交易。"""
    if getattr(request, 'permission', None) == 'therapist':
        return jsonify({"error": "無操作權限"}), 403

    data = request.json or {}
    master_product_id = _safe_int(data.get('master_product_id'))
    quantity = _safe_int(data.get('quantity'))
    if not master_product_id or not quantity:
        return jsonify({"error": "master_product_id 與 quantity 為必填"}), 400

    user_info = get_user_from_token(request)
    try:
        store_id, _, _ = _resolve_store_id(data.get('store_id'), user_info)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    if not store_id:
        return jsonify({"error": "請提供有效的 store_id"}), 400

    staff_id = _safe_int(data.get('staff_id')) or _safe_int(user_info.get('staff_id'))

    try:
        stock = receive_master_stock(
            master_product_id,
            quantity,
            store_id,
            staff_id,
            data.get('reference_no'),
            data.get('note'),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        print(f"[master_stock_inbound] {exc}")
        return jsonify({"error": "進貨失敗"}), 500

    return jsonify({"message": "主庫存已更新", "stock": stock})


@inventory_bp.route("/master/outbound", methods=["POST"])
@auth_required
def master_stock_outbound():
    """統一出貨：扣除 master 庫存但顯示各尾碼版本。"""
    if getattr(request, 'permission', None) == 'therapist':
        return jsonify({"error": "無操作權限"}), 403

    data = request.json or {}
    variant_id = _safe_int(data.get('variant_id'))
    quantity = _safe_int(data.get('quantity'))
    if not variant_id or not quantity:
        return jsonify({"error": "variant_id 與 quantity 為必填"}), 400

    user_info = get_user_from_token(request)
    try:
        store_id, _, _ = _resolve_store_id(data.get('store_id'), user_info)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403
    if not store_id:
        return jsonify({"error": "請提供有效的 store_id"}), 400

    staff_id = _safe_int(data.get('staff_id')) or _safe_int(user_info.get('staff_id'))

    try:
        stock = ship_variant_stock(
            variant_id,
            quantity,
            store_id,
            staff_id,
            data.get('reference_no'),
            data.get('note'),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        print(f"[master_stock_outbound] {exc}")
        return jsonify({"error": "出貨失敗"}), 500

    return jsonify({"message": "已扣除主庫存", "stock": stock})

        success = delete_inventory_item(inventory_id)
        if success:
            return jsonify({"message": "庫存記錄刪除成功", "success": True}), 200
        else:
            return jsonify({"error": "庫存記錄刪除失敗"}), 400

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


# =========================
# 產品列表（給庫存使用）
# =========================

@inventory_bp.route("/products", methods=["GET"])
def get_inventory_products():
    """獲取所有可用於庫存管理的產品列表"""
    try:
        products = get_product_list()
        return jsonify(products)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


# =========================
# 庫存匯出
# =========================

@inventory_bp.route("/export", methods=["GET"])
@auth_required
def export_inventory():
    """匯出庫存資料為Excel"""
    try:
        ctx = _get_auth_context()
        store_id_param = request.args.get("store_id")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        sale_staff = request.args.get("sale_staff")
        buyer = request.args.get("buyer")
        detail = request.args.get("detail")
        product_id = request.args.get("product_id")

        # admin 沒選 store_id → 查全部；一般使用者固定自己分店
        if ctx["is_admin"] and not store_id_param:
            target_store = None
        else:
            target_store = store_id_param or ctx["store_id"]

        if detail:
            inventory_data = get_inventory_history(
                target_store, start_date, end_date, sale_staff, buyer, product_id
            )
        else:
            inventory_data = export_inventory_data(target_store)

        df = pd.DataFrame(inventory_data)

        # 將欄位名稱轉換為中文（若欄位不存在不會報錯，只是無法 rename）
        df.rename(
            columns={
                "Inventory_ID": "庫存ID",
                "Product_ID": "產品ID",
                "ProductName": "產品名稱",
                "ProductCode": "產品編號",
                "StockIn": "入庫量",
                "StockOut": "出庫量",
                "StockLoan": "借出量",
                "StockQuantity": "庫存量",
                "StockThreshold": "庫存預警值",
                "Store_ID": "店鋪ID",
                "StoreName": "店鋪名稱",
                "StockInTime": "入庫時間",
                "SoldQuantity": "銷售量",
                "LastSoldTime": "最後銷售時間",
                "UnsoldDays": "未銷售天數",
            },
            inplace=True,
        )

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
            df.to_excel(writer, index=False, sheet_name="InventoryData")

            workbook = writer.book
            worksheet = writer.sheets["InventoryData"]

            # 標題格式
            header_format = workbook.add_format(
                {"bold": True, "bg_color": "#D9EAD3", "border": 1}
            )

            # 套用標題格式
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)

            # 自動調整欄寬
            for i, col in enumerate(df.columns):
                try:
                    max_len = df[col].astype(str).map(len).max()
                except Exception:
                    max_len = len(col)
                column_width = max(max_len, len(col)) + 2
                worksheet.set_column(i, i, column_width)

        output.seek(0)
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="庫存記錄.xlsx",
        )
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


# =========================
# Master Product / Master Stock API
# =========================

@inventory_bp.route("/master/products", methods=["GET"])
@auth_required
def list_master_products():
    """進貨視窗：僅顯示 master 商品，並依店型顯示成本價。"""
    keyword = request.args.get("q")
    ctx = _get_auth_context()
    store_type = ctx["store_type"]
    products = list_master_products_for_inbound(store_type, keyword)
    return jsonify(products)


@inventory_bp.route("/master/outbound/variants", methods=["GET"])
@auth_required
def list_outbound_variants():
    """出貨視窗：列出所有尾碼版本供選擇。"""
    keyword = request.args.get("q")
    variants = list_variants_for_outbound(keyword)
    return jsonify(variants)


@inventory_bp.route("/master/summary", methods=["GET"])
@auth_required
def master_stock_summary():
    """總覽 master 庫存"""
    keyword = request.args.get("q")
    summary = list_master_stock_summary(keyword)
    return jsonify(summary)


@inventory_bp.route("/master/<int:master_product_id>/variants", methods=["GET"])
@auth_required
def master_variants(master_product_id: int):
    """查詢指定 master 商品的尾碼版本明細。"""
    variants = list_variants_for_master(master_product_id)
    return jsonify(variants)


@inventory_bp.route("/master/inbound", methods=["POST"])
@auth_required
def master_stock_inbound():
    """統一進貨：直接更新 master 庫存並記錄交易。"""
    # 治療師沒有權限
    if getattr(request, "permission", None) == "therapist":
        return jsonify({"error": "無操作權限"}), 403

    data = request.json or {}
    master_product_id = _safe_int(data.get("master_product_id"))
    quantity = _safe_int(data.get("quantity"))

    if not master_product_id or not quantity:
        return jsonify({"error": "master_product_id 與 quantity 為必填"}), 400

    user_info = get_user_from_token(request)
    try:
        store_id, _, _ = _resolve_store_id(data.get("store_id"), user_info)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    if not store_id:
        return jsonify({"error": "請提供有效的 store_id"}), 400

    staff_id = _safe_int(data.get("staff_id")) or _safe_int(user_info.get("staff_id"))

    try:
        stock = receive_master_stock(
            master_product_id,
            quantity,
            store_id,
            staff_id,
            data.get("reference_no"),
            data.get("note"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        print(f"[master_stock_inbound] {exc}")
        return jsonify({"error": "進貨失敗"}), 500

    return jsonify({"message": "主庫存已更新", "stock": stock})


@inventory_bp.route("/master/outbound", methods=["POST"])
@auth_required
def master_stock_outbound():
    """統一出貨：扣除 master 庫存但顯示各尾碼版本。"""
    # 治療師沒有權限
    if getattr(request, "permission", None) == "therapist":
        return jsonify({"error": "無操作權限"}), 403

    data = request.json or {}
    variant_id = _safe_int(data.get("variant_id"))
    quantity = _safe_int(data.get("quantity"))

    if not variant_id or not quantity:
        return jsonify({"error": "variant_id 與 quantity 為必填"}), 400

    user_info = get_user_from_token(request)
    try:
        store_id, _, _ = _resolve_store_id(data.get("store_id"), user_info)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 403

    if not store_id:
        return jsonify({"error": "請提供有效的 store_id"}), 400

    staff_id = _safe_int(data.get("staff_id")) or _safe_int(user_info.get("staff_id"))

    try:
        stock = ship_variant_stock(
            variant_id,
            quantity,
            store_id,
            staff_id,
            data.get("reference_no"),
            data.get("note"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        print(f"[master_stock_outbound] {exc}")
        return jsonify({"error": "出貨失敗"}), 500

    return jsonify({"message": "已扣除主庫存", "stock": stock})
