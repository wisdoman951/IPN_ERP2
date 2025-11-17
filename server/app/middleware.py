# server\app\middleware.py
from flask import request, jsonify, g
from functools import wraps
import jwt
import datetime
from app.config import JWT_SECRET_KEY


def _as_int(value):
    """Convert string-like integers to ``int`` while keeping other types unchanged."""
    if value is None or isinstance(value, int):
        return value
    try:
        return int(value)
    except (TypeError, ValueError):
        return value

def auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # 從Authorization標頭中獲取token
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            # 嘗試從舊的標頭取得store_id
            store_id = _as_int(request.headers.get('X-Store-ID'))
            store_level = request.headers.get('X-Store-Level')
            store_name = request.headers.get('X-Store-Name')
            permission = request.headers.get('X-Permission')
            staff_id = _as_int(request.headers.get('X-Staff-ID'))
            store_type = request.headers.get('X-Store-Type')

            if not store_id or not store_level:
                return jsonify({"error": "認證失敗，請重新登入"}), 401

            # 設置到request以便後續使用
            request.store_id = store_id
            request.store_level = store_level
            request.store_name = store_name
            request.permission = permission
            request.staff_id = staff_id
            request.store_type = store_type
        else:
            try:
                # 驗證JWT token
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])

                # 可以從payload中獲取store_id和store_level
                store_id = _as_int(payload.get('store_id'))
                store_level = payload.get('store_level')
                store_name = payload.get('store_name')
                permission = payload.get('permission')
                staff_id = _as_int(payload.get('staff_id'))
                store_type = payload.get('store_type')

                if not store_id or not store_level:
                    return jsonify({"error": "無效的認證信息"}), 401

                # 將store信息添加到request對象以供後續使用
                request.store_id = store_id
                request.store_level = store_level
                request.store_name = store_name
                request.permission = permission
                request.staff_id = staff_id
                request.store_type = store_type

            except jwt.ExpiredSignatureError:
                return jsonify({"error": "認證已過期，請重新登入"}), 401
            except (jwt.InvalidTokenError, Exception) as e:
                return jsonify({"error": f"無效的認證: {str(e)}"}), 401
        
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 優先使用 JWT token 內的資訊進行驗證
        user = get_user_from_token(request)
        if user:
            store_id = user.get('store_id')
            store_level = user.get('store_level')
            permission = user.get('permission')
            print(f"[DEBUG] admin_required token_user={user}")
        else:
            # 回退到標頭資訊（舊版客戶端）
            store_id = request.headers.get('X-Store-ID')
            store_level = request.headers.get('X-Store-Level')
            permission = request.headers.get('X-Permission')
            print(f"[DEBUG] admin_required header store_id={store_id}, store_level={store_level}, permission={permission}")

        if not store_id or not store_level:
            return jsonify({"error": "認證失敗，請重新登入"}), 401

        # 只有總店或具有 admin 權限的使用者可通過
        if store_level not in ["總店", "admin"] and permission != "admin":
            return jsonify({"error": "需要管理員權限"}), 403

        # 將驗證後資訊附加到 request 方便後續使用
        request.store_id = store_id
        request.store_level = store_level
        request.permission = permission

        return f(*args, **kwargs)
    return decorated_function

# 添加login_required裝飾器，改為使用JWT token認證
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        # 從 Authorization header 獲取 token
        if 'Authorization' in request.headers:
            # 格式應為 'Bearer <token>'
            try:
                token = request.headers['Authorization'].split(" ")[1]
            except IndexError:
                return jsonify({"error": "無效的 Token 格式"}), 401

        if not token:
            return jsonify({"error": "缺少授權 Token"}), 401

        try:
            # 解碼 JWT，獲取 payload
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            # 將使用者資訊存入 Flask 的 g 物件，g 在單次請求中是全域的
            g.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token 已過期"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "無效的 Token"}), 401
        
        return f(*args, **kwargs)
    return decorated_function

def get_user_from_token(request):
    """
    從 request 中的 JWT token 提取用戶信息
    返回包含 store_id, store_level, store_name, staff_id 等信息的字典
    """
    token = None
    user_info = {}
    
    # 從Authorization標頭中獲取token
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    
    if not token:
        return {
            'store_id': _as_int(getattr(request, 'store_id', None)),
            'store_level': getattr(request, 'store_level', None),
            'store_name': getattr(request, 'store_name', None),
            'staff_id': _as_int(getattr(request, 'staff_id', None)),
            'permission': getattr(request, 'permission', None),
            'store_type': getattr(request, 'store_type', None),
        }
    
    try:
        # 驗證JWT token
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        
        # 從payload中獲取用戶信息
        user_info = {
            'store_id': _as_int(payload.get('store_id')),
            'store_level': payload.get('store_level'),
            'store_name': payload.get('store_name'),
            'staff_id': _as_int(payload.get('staff_id')),
            'permission': payload.get('permission'),
            'store_type': payload.get('store_type'),
        }
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
        # 如果token無效或過期，回退到由 auth_required 設置的請求屬性
        user_info = {}

    if not user_info:
        user_info = {
            'store_id': _as_int(getattr(request, 'store_id', None)),
            'store_level': getattr(request, 'store_level', None),
            'store_name': getattr(request, 'store_name', None),
            'staff_id': _as_int(getattr(request, 'staff_id', None)),
            'permission': getattr(request, 'permission', None),
            'store_type': getattr(request, 'store_type', None),
        }

    return user_info
