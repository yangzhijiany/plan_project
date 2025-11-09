#!/bin/bash

# 启动后端服务器脚本

echo "🚀 正在启动后端服务器..."
echo ""

cd "$(dirname "$0")/backend" || exit 1

# 检查虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo "❌ 虚拟环境不存在，请先运行: python3 -m venv venv"
    exit 1
fi

# 激活虚拟环境
source venv/bin/activate

# 检查依赖是否安装
if ! python -c "import fastapi" 2>/dev/null; then
    echo "⚠️  依赖未安装，正在安装..."
    pip install -r requirements.txt
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在，请先设置 OPENAI_API_KEY"
    echo "   创建 .env 文件并添加: OPENAI_API_KEY=your_api_key"
fi

echo "✅ 后端服务器启动中..."
echo "📍 访问地址: http://localhost:8000"
echo "📚 API 文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 启动服务器
uvicorn main:app --reload --host 0.0.0.0 --port 8000

