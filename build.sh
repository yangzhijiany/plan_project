#!/bin/bash
set -e

echo "🚀 开始构建项目..."

# 检查 Node.js
echo "📦 检查 Node.js..."
node --version || (echo "❌ Node.js 未安装" && exit 1)
npm --version || (echo "❌ npm 未安装" && exit 1)

# 构建前端
echo "📦 构建前端..."
cd frontend
echo "当前目录: $(pwd)"
echo "package.json 存在: $(test -f package.json && echo '是' || echo '否')"

npm ci --production=false
echo "✅ 依赖安装完成"

npm run build
echo "✅ 前端构建完成"

# 检查构建结果
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    echo "✅ dist 目录存在且有文件"
    ls -la dist
else
    echo "❌ dist 目录不存在或为空"
    exit 1
fi

cd ..

# 初始化数据库
echo "🗄️  初始化数据库..."
cd backend
python -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()"
echo "✅ 数据库初始化完成"
cd ..

echo "✅ 构建完成！"
