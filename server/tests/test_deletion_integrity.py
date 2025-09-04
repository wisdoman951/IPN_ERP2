import os
import sys
import pytest
import importlib.util
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]


def load_module(relative_path: str):
    """Load a module from a relative file path without importing the package"""
    module_path = BASE_DIR / relative_path
    spec = importlib.util.spec_from_file_location(relative_path, module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(autouse=True)
def stub_app_module(monkeypatch):
    import types

    app_module = types.ModuleType("app")
    config_module = types.ModuleType("app.config")
    config_module.DB_CONFIG = {}
    utils_module = types.ModuleType("app.utils")
    utils_module.get_store_based_where_condition = lambda *args, **kwargs: ""

    sys.modules["app"] = app_module
    sys.modules["app.config"] = config_module
    sys.modules["app.utils"] = utils_module
    yield
    sys.modules.pop("app.config", None)
    sys.modules.pop("app.utils", None)
    sys.modules.pop("app", None)


class FakeCursor:
    def __init__(self):
        self.queries = []

    def execute(self, sql, params=None):
        self.queries.append(sql.strip())
        # 模擬刪除成功
        return 1

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        pass


class FakeConnection:
    def __init__(self):
        self.cursor_obj = FakeCursor()

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass

    def begin(self):
        pass


def test_delete_member_removes_health_status(monkeypatch):
    member_model = load_module("app/models/member_model.py")

    fake_conn = FakeConnection()
    monkeypatch.setattr(member_model, "connect_to_db", lambda: fake_conn)

    member_model.delete_member_and_related_data(1)

    queries = fake_conn.cursor_obj.queries
    assert any("FROM `health_status`" in q for q in queries), "health_status table not cleared"


def test_delete_stress_test_cascades_answers(monkeypatch):
    stress_test_model = load_module("app/models/stress_test_model.py")

    fake_conn = FakeConnection()
    monkeypatch.setattr(stress_test_model, "connect_to_db", lambda: fake_conn)

    stress_test_model.delete_stress_test(1)

    queries = fake_conn.cursor_obj.queries
    assert queries[0].startswith("DELETE FROM ipn_stress_answer"), "answers not removed first"
    assert queries[1].startswith("DELETE FROM ipn_stress"), "stress record not deleted"


def test_delete_product_preserves_sales(monkeypatch):
    product_model = load_module("app/models/product_model.py")

    fake_conn = FakeConnection()
    monkeypatch.setattr(product_model, "connect_to_db", lambda: fake_conn)

    product_model.delete_product(1)

    queries = fake_conn.cursor_obj.queries
    # 應先將 product_sell 的 product_id 設為 NULL，然後刪除 product
    assert queries[0].startswith("UPDATE product_sell SET product_id = NULL"), "product sells not preserved"
    assert queries[1].startswith("DELETE FROM product"), "product not deleted"


def test_delete_therapy_preserves_sales(monkeypatch):
    therapy_model = load_module("app/models/therapy_model.py")

    fake_conn = FakeConnection()
    monkeypatch.setattr(therapy_model, "connect_to_db", lambda: fake_conn)

    therapy_model.delete_therapy(1)

    queries = fake_conn.cursor_obj.queries
    # 應先將 therapy_sell 的 therapy_id 設為 NULL，然後刪除 therapy
    assert queries[0].startswith("UPDATE therapy_sell SET therapy_id = NULL"), "therapy sells not preserved"
    assert queries[1].startswith("DELETE FROM therapy"), "therapy not deleted"

