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

# 安装系统依赖（包括 bash，虽然我们用 sh，但确保 shell 可用）
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

# 暴露端口（Railway 会使用环境变量 PORT）
EXPOSE 8000

# 设置环境变量
ENV PYTHONUNBUFFERED=1

# 设置工作目录为 backend（避免在脚本中使用 cd）
WORKDIR /app/backend

# 启动命令（直接在 CMD 中执行，不依赖外部脚本）
# Railway 会自动设置 PORT 环境变量
# 使用 sh -c 确保 shell 可用，并且环境变量能够正确展开
CMD ["sh", "-c", "python3 -c \"import sys; sys.path.insert(0, '.'); from database import init_db; init_db()\" && python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
