#!/bin/sh
set -e

echo "🚀 启动应用..."

echo "🗄️  初始化数据库..."
cd /app/backend
python3 -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()"
echo "✅ 数据库初始化完成"

PORT=${PORT:-8000}
echo "📡 启动服务在端口: $PORT"

exec python3 -m uvicorn main:app --host 0.0.0.0 --port "$PORT"

