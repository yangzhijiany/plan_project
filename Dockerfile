# ============================
# 阶段 1：构建前端
# ============================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制依赖并安装
COPY frontend/package*.json ./
RUN npm ci

# 复制前端代码并构建
COPY frontend/ ./
RUN npm run build


# ============================
# 阶段 2：构建后端运行环境
# ============================
FROM python:3.13-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    bash gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制后端依赖文件
COPY backend/requirements.txt ./backend/
COPY requirements.txt ./

# 安装 Python 依赖
RUN pip install --no-cache-dir -r backend/requirements.txt

# 复制构建好的前端静态文件
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 复制后端代码
COPY backend/ ./backend/

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/backend:$PATH"

# 暴露端口（Railway 会注入 PORT）
EXPOSE 8000

# 添加启动脚本
COPY backend/entrypoint.sh /app/backend/
RUN chmod +x /app/backend/entrypoint.sh

# 进入 backend 目录
WORKDIR /app/backend

# 启动命令
CMD ["sh", "./entrypoint.sh"]
