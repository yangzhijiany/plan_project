#!/bin/bash
set -e

echo "🚀 开始构建项目..."

# 构建前端
echo "📦 构建前端..."
cd frontend
npm install
npm run build
cd ..

# 初始化数据库
echo "🗄️  初始化数据库..."
cd backend
python -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()"
cd ..

echo "✅ 构建完成！"

