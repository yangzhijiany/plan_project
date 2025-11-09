#!/bin/sh
set -e

echo "🔹 正在初始化数据库..."
cd /app/backend
python3 -c "from database import init_db; init_db()"

echo "✅ 数据库初始化完成，启动 FastAPI 服务..."
exec python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
