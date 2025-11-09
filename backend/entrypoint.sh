#!/bin/sh
set -e

BACKEND_DIR="/app/backend"

# 确保 Python 可以找到后端模块
export PYTHONPATH="$BACKEND_DIR${PYTHONPATH:+:$PYTHONPATH}"

echo "🔹 正在初始化数据库..."
python3 -c "from database import init_db; init_db()"

echo "✅ 数据库初始化完成，启动 FastAPI 服务..."

# Railway 会自动设置 PORT 环境变量，如果没有则使用 8000
PORT=${PORT:-8000}
echo "📡 启动服务在端口: $PORT"

# 启动 FastAPI 服务（无需 cd，依赖 PYTHONPATH）
exec python3 -m uvicorn main:app --host 0.0.0.0 --port "$PORT"
