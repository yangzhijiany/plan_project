#!/bin/bash
set -e

echo "🚀 启动应用..."

# 初始化数据库
echo "🗄️  初始化数据库..."
cd /app/backend
python3 -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()"
echo "✅ 数据库初始化完成"

# 使用环境变量 PORT（Railway 会自动设置），如果没有则使用 8000
PORT=${PORT:-8000}
echo "📡 启动服务在端口: $PORT"

# 执行传入的命令，添加端口参数
exec "$@" --port "$PORT"
