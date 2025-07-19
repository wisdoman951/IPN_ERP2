# server\app\middleware.py
from flask import request, jsonify, g
from functools import wraps
from app.models.login_model import find_store_by_account
import jwt
import datetime
from app.config import JWT_SECRET_KEY

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
            store_id = request.headers.get('X-Store-ID')
            store_level = request.headers.get('X-Store-Level')
            
            if not store_id or not store_level:
                return jsonify({"error": "認證失敗，請重新登入"}), 401
            
            # 設置到request以便後續使用
            request.store_id = store_id
            request.store_level = store_level
        else:
            try:
                # 驗證JWT token
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
                
                # 可以從payload中獲取store_id和store_level
                store_id = payload.get('store_id')
                store_level = payload.get('store_level')
                store_name = payload.get('store_name')
                permission = payload.get('permission')
                
                if not store_id or not store_level:
                    return jsonify({"error": "無效的認證信息"}), 401
                    
                # 將store信息添加到request對象以供後續使用
                request.store_id = store_id
                request.store_level = store_level
                request.store_name = store_name
                request.permission = permission
                
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "認證已過期，請重新登入"}), 401
            except (jwt.InvalidTokenError, Exception) as e:
                return jsonify({"error": f"無效的認證: {str(e)}"}), 401
        
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        """驗證是否為管理員，可從 JWT 或標頭取得權限資料"""

        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if token:
            try:
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
                store_level = payload.get('store_level')
                permission = payload.get('permission')
                if store_level != '總店' and permission != 'admin':
                    return jsonify({"error": "需要管理員權限"}), 403

                request.store_id = payload.get('store_id')
                request.store_level = store_level
                request.permission = permission
                return f(*args, **kwargs)
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                return jsonify({"error": "認證失敗，請重新登入"}), 401

        # fallback to legacy headers
        store_id = request.headers.get('X-Store-ID')
        store_level = request.headers.get('X-Store-Level')
        if not store_id or not store_level:
            return jsonify({"error": "認證失敗，請重新登入"}), 401

        if store_level != "總店" and store_level != "admin":
            return jsonify({"error": "需要管理員權限"}), 403

        request.store_id = store_id
        request.store_level = store_level
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
        return user_info
    
    try:
        # 驗證JWT token
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        
        # 從payload中獲取用戶信息
        user_info = {
            'store_id': payload.get('store_id'),
            'store_level': payload.get('store_level'),
            'store_name': payload.get('store_name'),
            'staff_id': payload.get('staff_id'),
            'permission': payload.get('permission')
        }
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
        # 如果token無效或過期，返回空字典
        pass
    
    return user_info 