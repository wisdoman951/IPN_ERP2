# 使用 Node.js 官方映像
FROM node:18

# 設定工作目錄
WORKDIR /app

# 複製 package.json 與 package-lock.json 並安裝依賴
COPY package*.json ./
RUN npm install

# 複製剩下的原始碼
COPY . .

# 對外開放 Vite / React 預設開發 Port
EXPOSE 5173 3000 3001

# 啟動前端開發伺服器
CMD ["npm", "run", "dev"]