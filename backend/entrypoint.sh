#!/bin/sh
set -e

echo "🔹 初始化数据库..."
python3 -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()"

echo "✅ 数据库初始化完成，启动服务器..."
exec python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
