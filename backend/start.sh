#!/bin/bash

# Railway 启动脚本
# 如果使用 PostgreSQL，运行迁移
if [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" == postgres* ]]; then
    echo "使用 PostgreSQL 数据库"
    python -c "from database import init_db; init_db()"
fi

# 启动 FastAPI 服务
# Railway 会自动设置 PORT 环境变量
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
