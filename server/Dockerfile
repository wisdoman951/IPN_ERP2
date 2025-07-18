# 使用 Python 3.9 的 base image
FROM python:3.9-slim

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 設定工作目錄
WORKDIR /app

# 複製 requirements.txt 並安裝套件
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 複製整個專案程式碼
COPY . .

# 對外開放 Flask port
EXPOSE 5000

# 執行 Flask 應用（你用 run.py 作為進入點）
CMD ["python", "run.py"]
