#!/bin/sh
set -e

echo "🔹 正在初始化数据库..."
cd /app/backend
python3 -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()"

echo "✅ 数据库初始化完成，启动 FastAPI 服务..."

# Railway 会自动设置 PORT 环境变量，如果没有则使用 8000
PORT=${PORT:-8000}
echo "📡 启动服务在端口: $PORT"

# 切换到 backend 目录并启动服务
cd /app/backend
exec python3 -m uvicorn main:app --host 0.0.0.0 --port "$PORT"
