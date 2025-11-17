import datetime
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.inventory_model import _normalize_date_for_sort


def test_normalize_date_for_sort_handles_none_and_strings():
    assert _normalize_date_for_sort(None) == datetime.datetime.min

    iso_value = "2024-05-12T15:30:00"
    assert _normalize_date_for_sort(iso_value) == datetime.datetime.fromisoformat(iso_value)

    slash_value = "2024/05/12 08:15:00"
    parsed_slash = _normalize_date_for_sort(slash_value)
    assert isinstance(parsed_slash, datetime.datetime)
    assert parsed_slash.year == 2024 and parsed_slash.month == 5 and parsed_slash.day == 12


def test_sort_key_does_not_raise_with_mixed_values():
    rows = [
        {"Date": None, "Inventory_ID": 3},
        {"Date": "2023-01-02", "Inventory_ID": 2},
        {"Date": datetime.datetime(2024, 1, 1), "Inventory_ID": 1},
    ]

    try:
        rows.sort(
            key=lambda r: (
                _normalize_date_for_sort(r.get("Date")),
                r.get("Inventory_ID") or 0,
            ),
            reverse=True,
        )
    except TypeError:
        raise AssertionError("Sorting should not raise TypeError for mixed date values")

    assert rows[0]["Inventory_ID"] == 1
    assert rows[-1]["Inventory_ID"] == 3
