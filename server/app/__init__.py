from flask import Flask, request, make_response, jsonify
from flask_cors import CORS
from app.routes.therapy import therapy_bp
from app.routes.member import member_bp
from app.routes.medical_record import medical_bp
from app.routes.login import login_bp
from app.routes.stress_test import stress_test
from app.routes.therapy_sell import therapy_sell
from app.routes.inventory import inventory_bp
from app.routes.health_check import health_check_bp
from app.routes.staff import staff_bp
from app.routes.pure_medical_record import pure_medical_bp
from app.routes.product_bundle import product_bundle_bp
from .routes.sales_order_routes import sales_order_bp
from app.routes.store import store_bp

def create_app():
    app = Flask(__name__)

    # 設定 CORS，允許所有來源的跨域請求
    CORS(app, supports_credentials=True)

    # 添加全局特定的 CORS 處理中間件
    @app.after_request
    def add_cors_headers(response):
        # 處理 Access-Control-Allow-Origin
        origin = request.headers.get('Origin')
        if origin:
            response.headers.set('Access-Control-Allow-Origin', origin)
        else:
            response.headers.set('Access-Control-Allow-Origin', '*')
        
        # 添加其他 CORS 標頭
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Store-ID, X-Store-Level, Accept, Origin')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Max-Age', '600')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        
        # 確保響應類型
        if request.method == 'OPTIONS':
            return response
            
        return response

    # 全局 OPTIONS 請求處理
    @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    @app.route('/<path:path>', methods=['OPTIONS'])
    def handle_options(path):
        response = make_response()
        origin = request.headers.get('Origin')
        if origin:
            response.headers.set('Access-Control-Allow-Origin', origin)
        else:
            response.headers.set('Access-Control-Allow-Origin', '*')
        
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Store-ID, X-Store-Level, Accept, Origin')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Max-Age', '600')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        return response

    # 註冊路由 - 確保 URL 前綴沒有尾部斜杠
    app.register_blueprint(therapy_bp, url_prefix='/api/therapy')
    app.register_blueprint(member_bp, url_prefix='/api/member')
    app.register_blueprint(medical_bp, url_prefix='/api/medical-record')
    app.register_blueprint(login_bp, url_prefix='/api/login')
    app.register_blueprint(stress_test, url_prefix='/api/stress-test')
    app.register_blueprint(staff_bp, url_prefix='/api/staff')
    app.register_blueprint(product_bundle_bp, url_prefix='/api/product-bundles')
    from app.routes.product import product_bp
    app.register_blueprint(product_bp, url_prefix='/api/product')
    app.register_blueprint(store_bp, url_prefix='/api/stores')

    # 註冊產品銷售路由
    from app.routes.product_sell import product_sell_bp
    app.register_blueprint(product_sell_bp, url_prefix='/api/product-sell')
    
    # 註冊療程銷售路由
    app.register_blueprint(therapy_sell, url_prefix='/api/therapy-sell')
    
    # 註冊庫存路由
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
    
    # 註冊健康檢查路由
    app.register_blueprint(health_check_bp, url_prefix='/api/health-check')
    
    # 註冊淨化健康紀錄路由
    app.register_blueprint(pure_medical_bp, url_prefix='/api/pure-medical-record')

    # 銷售單路由
    app.register_blueprint(sales_order_bp)

    # 添加根路徑的處理函數
    @app.route('/', methods=['GET', 'OPTIONS'])
    def index():
        if request.method == 'OPTIONS':
            return make_response()
        return jsonify({"message": "Welcome to IPN ERP System API"})

    return app