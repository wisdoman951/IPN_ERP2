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

    sys.modules["app"] = app_module
    sys.modules["app.config"] = config_module
    yield
    sys.modules.pop("app.config", None)
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

