# 多阶段构建：先构建前端，再运行后端
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖文件
COPY frontend/package*.json ./

# 安装前端依赖
RUN npm ci

# 复制前端源代码
COPY frontend/ ./

# 构建前端
RUN npm run build

# Python 运行环境
FROM python:3.13-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制后端依赖文件
COPY backend/requirements.txt ./backend/
COPY requirements.txt ./

# 安装 Python 依赖
RUN pip install --no-cache-dir -r backend/requirements.txt

# 从构建阶段复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 复制后端源代码
COPY backend/ ./backend/

# 复制启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 暴露端口（Railway 会使用环境变量 PORT）
EXPOSE 8000

# 设置环境变量
ENV PYTHONUNBUFFERED=1

# 启动脚本
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["python3", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0"]
