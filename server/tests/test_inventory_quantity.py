import sys
import os
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.product_sell_model import update_inventory_quantity


def test_update_inventory_quantity_updates_only_latest_record():
    cursor = MagicMock()
    cursor.execute.return_value = 1

    result = update_inventory_quantity(1, 2, -2, cursor)

    assert result is True
    executed_query = cursor.execute.call_args[0][0]
    assert "ORDER BY inventory_id DESC" in executed_query
    assert "LIMIT 1" in executed_query
    cursor.execute.assert_called_once_with(executed_query, (-2, 1, 2))
