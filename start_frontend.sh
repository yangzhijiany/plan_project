#!/bin/bash

# 启动前端服务器脚本

echo "🚀 正在启动前端服务器..."
echo ""

cd "$(dirname "$0")/frontend" || exit 1

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "⚠️  依赖未安装，正在安装..."
    npm install
fi

echo "✅ 前端服务器启动中..."
echo "📍 访问地址: http://localhost:5173"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 启动开发服务器
npm run dev

