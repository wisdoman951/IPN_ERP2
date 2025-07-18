from app import create_app
from flask_cors import CORS

app = create_app()

# ✅ 修改為允許跨來源（如 ngrok 或 localhost:5173）
CORS(app, resources={r"/api/*": {"origins": "*"}})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

