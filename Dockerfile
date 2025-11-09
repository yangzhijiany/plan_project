# ============================
# 阶段 1：构建前端
# ============================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# ============================
# 阶段 2：构建后端
# ============================
FROM python:3.13-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y bash gcc && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# 复制前端静态资源
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 复制后端代码
COPY backend/ ./backend/

# 添加启动脚本（放到固定路径）
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 设置环境变量
ENV PYTHONUNBUFFERED=1

# 暴露端口（Railway 会使用环境变量 PORT）
EXPOSE 8000

# 设置工作目录为 backend
WORKDIR /app/backend

# 明确使用绝对路径启动（使用 sh -c 确保环境变量正确展开）
CMD ["/bin/sh", "/entrypoint.sh"]
