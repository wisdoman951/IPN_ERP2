import io
import xlsxwriter

from flask import Blueprint, request, jsonify, send_file
from app.models.health_check_model import (
    get_all_health_checks,
    search_health_checks,
    get_member_health_check,
    create_health_check,
    update_health_check,
    delete_health_check,
    get_all_health_checks_for_export
)
from app.middleware import auth_required, login_required

health_check_bp = Blueprint("health-check", __name__)

@health_check_bp.route("", methods=["GET"])
@login_required
def list_health_checks():
    try:
        records = get_all_health_checks()
        return jsonify(records)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@health_check_bp.route("/search", methods=["GET"])
@login_required
def search_health_check():
    keyword = request.args.get("keyword", "")
    try:
        result = search_health_checks(keyword)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@health_check_bp.route("/member/<member_id>", methods=["GET"])
@login_required
def get_member_check(member_id):
    try:
        record = get_member_health_check(member_id)
        if record:
            return jsonify(record)
        else:
            return jsonify({"error": "找不到該會員的健康檢查記錄"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@health_check_bp.route("", methods=["POST"])
@login_required
def create_health_check_record():
    data = request.json
    try:
        check_id = create_health_check(data)
        return jsonify({"message": "新增成功", "id": check_id}), 201
    except Exception as e:
        error_str = str(e)
        # Check for foreign key constraint error
        if "foreign key constraint fails" in error_str and "Member_ID" in error_str:
            return jsonify({"error": "會員編號不存在，請先建立會員資料"}), 400
        return jsonify({"error": error_str}), 500

@health_check_bp.route("/<int:check_id>", methods=["PUT"])
@login_required
def update_health_check_record(check_id):
    data = request.json
    try:
        success = update_health_check(check_id, data)
        if success:
            return jsonify({"message": "更新成功"}), 200
        else:
            return jsonify({"error": "找不到該健康檢查記錄或無資料更新"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@health_check_bp.route("/<int:check_id>", methods=["DELETE"])
@login_required
def delete_health_check_record(check_id):
    try:
        success = delete_health_check(check_id)
        if success:
            return jsonify({"message": "刪除成功"}), 200
        else:
            return jsonify({"error": "找不到該健康檢查記錄"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@health_check_bp.route("/export", methods=["GET"])
@login_required
def export_health_checks():
    try:
        records = get_all_health_checks_for_export()

        # 建立 Excel 檔案
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet("健康檢查紀錄")

        headers = [
            "ID", "姓名", "會員編號", "身高", "體重", "血壓", "微整型", "微整型備註",
            "體脂肪", "內脂肪", "基礎代謝", "體年", "BMI", "備註"
        ]

        # 寫入欄位名稱
        for col_num, header in enumerate(headers):
            worksheet.write(0, col_num, header)

        # 寫入資料列
        for row_num, row in enumerate(records, 1):
            for col_num, value in enumerate(row):
                worksheet.write(row_num, col_num, value)

        workbook.close()
        output.seek(0)

        return send_file(
            output,
            download_name="健康檢查紀錄.xlsx",
            as_attachment=True,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500 