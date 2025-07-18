#server/app/config.py
import os
import secrets
from dotenv import load_dotenv
import pymysql.cursors
import pymysql
load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT")),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_DATABASE"),
    "charset": "utf8mb4"
}


# 生成安全的隨機密鑰函數
def generate_secret_key():
    return secrets.token_hex(32)  # 生成 64 字符長的隨機十六進制字符串

# JWT配置
# 如果環境變量中沒有設置 JWT_SECRET_KEY，則自動生成一個安全的密鑰
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    JWT_SECRET_KEY = generate_secret_key()
    print(f"警告: 未設置JWT_SECRET_KEY環境變量，已自動生成臨時密鑰。僅推薦用於開發環境。")
    print(f"為了生產環境安全，建議在.env文件中設置固定的JWT_SECRET_KEY。")

# JWT過期時間，默認1天（86400秒）
JWT_EXPIRATION = int(os.getenv("JWT_EXPIRATION", 86400))
