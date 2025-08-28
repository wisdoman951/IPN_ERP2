import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.models import therapy_model


def test_export_therapy_records_queries_use_store_name(monkeypatch):
    queries = []

    class DummyCursor:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            pass

        def execute(self, query, params=None):
            queries.append(query)

        def fetchall(self):
            return []

    class DummyConn:
        def cursor(self):
            return DummyCursor()

        def close(self):
            pass

    # Without store filter
    monkeypatch.setattr(therapy_model, 'connect_to_db', lambda: DummyConn())
    therapy_model.export_therapy_records()

    # With store filter
    monkeypatch.setattr(therapy_model, 'connect_to_db', lambda: DummyConn())
    therapy_model.export_therapy_records(store_id=1)

    assert 's.store_name as store_name' in queries[0].lower()
    assert 's.store_name as store_name' in queries[1].lower()
