# IPN_ERP/server/app/utils.py

from flask_login import current_user
from flask import g 

def get_store_based_where_condition(table_alias=None):
    """
    根據 g 物件中的使用者權限，產生 SQL 的 WHERE 條件句。
    """
    # 檢查 g 物件中是否有 user 資訊 (由 middleware 注入)
    if not hasattr(g, 'user'):
        # 如果沒有，代表請求未經過驗證，回傳一個永遠為假的條件
        return (" AND 1=0 ", [])

    user_info = g.user
    permission = user_info.get('permission')
    store_id = user_info.get('store_id')

    if permission == 'admin':
        return ("", [])

    if permission == 'basic' and store_id:
        field = f"{table_alias}.store_id" if table_alias else "store_id"
        return (f" AND {field} = %s ", [store_id])
    
    return (" AND 1=0 ", [])