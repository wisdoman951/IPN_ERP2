#!/usr/bin/env python3
import sys
import os
import pymysql
import json
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 啟用 CORS
# 將server目錄添加到系統路徑，以便能夠導入app模組
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.config import DB_CONFIG

def connect_to_db():
    """連接到資料庫"""
    try:
        conn = pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)
        print("✅ 成功連接到資料庫")
        return conn
    except Exception as e:
        print(f"❌ 資料庫連接失敗: {str(e)}")
        sys.exit(1)

def setup_store_data(conn):
    """設置商店測試數據"""
    try:
        with conn.cursor() as cursor:
            # 清空現有數據
            cursor.execute("DELETE FROM store WHERE store_id IN (1, 2)")
            
            # 插入測試數據 - 總店和分店
            cursor.execute("""
                INSERT INTO store (store_id, store_name, store_location, password, permission) 
                VALUES (1, '全崴總部', '台北市', 'password', 'admin')
            """)
            
            cursor.execute("""
                INSERT INTO store (store_id, store_name, store_location, password, permission) 
                VALUES (2, '全崴分店', '台中市', 'password', 'basic')
            """)
            
            conn.commit()
            print("✅ 商店測試數據設置成功")
    except Exception as e:
        conn.rollback()
        print(f"❌ 設置商店測試數據失敗: {str(e)}")

def verify_store_data(conn):
    """驗證商店測試數據"""
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM store WHERE store_id IN (1, 2)")
            stores = cursor.fetchall()
            
            if len(stores) == 2:
                print("\n=== 商店測試數據 ===")
                for store in stores:
                    print(json.dumps(store, indent=2, ensure_ascii=False))
                print("✅ 商店測試數據驗證成功")
            else:
                print(f"❌ 商店測試數據不完整: 僅找到 {len(stores)} 條數據")
    except Exception as e:
        print(f"❌ 驗證商店測試數據失敗: {str(e)}")

def main():
    """主函數"""
    print("🔧 開始設置測試數據...")
    
    # 連接資料庫
    conn = connect_to_db()
    
    try:
        # 設置各種測試數據
        setup_store_data(conn)
        
        # 驗證測試數據
        verify_store_data(conn)
        
        print("\n✅ 測試數據設置完成")
    except Exception as e:
        print(f"\n❌ 設置測試數據失敗: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    main() 