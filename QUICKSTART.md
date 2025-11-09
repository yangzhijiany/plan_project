# 快速开始指南

## 前置要求

1. Python 3.8+ 
2. Node.js 16+
3. OpenAI API Key

## 快速启动

### 1. 后端设置

```bash
cd backend

# 创建虚拟环境（可选但推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 创建 .env 文件并添加你的 API Key
echo "OPENAI_API_KEY=your_api_key_here" > .env

# 启动后端（在 backend 目录下）
uvicorn main:app --reload
```

后端将在 `http://localhost:8000` 运行。

### 2. 前端设置

打开新的终端窗口：

```bash
cd frontend

# 安装依赖
npm install

# 启动前端
npm run dev
```

前端将在 `http://localhost:5173` 运行。

## 使用步骤

1. 访问 `http://localhost:5173`
2. 输入任务信息并点击"生成计划"
3. 查看生成的计划
4. 点击"日历视图"查看所有计划

## 故障排除

### 后端无法启动
- 检查 Python 版本：`python --version`
- 检查依赖是否安装：`pip list`
- 检查 .env 文件是否存在且包含 OPENAI_API_KEY

### 前端无法启动
- 检查 Node.js 版本：`node --version`
- 删除 node_modules 并重新安装：`rm -rf node_modules && npm install`

### API 调用失败
- 检查后端是否运行在 8000 端口
- 检查 OpenAI API Key 是否有效
- 检查网络连接

## 项目结构

```
plan_project/
├── backend/           # FastAPI 后端
│   ├── main.py       # 主应用文件
│   ├── models.py     # 数据库模型
│   ├── database.py   # 数据库配置
│   └── requirements.txt
├── frontend/         # React 前端
│   ├── src/
│   │   ├── App.jsx
│   │   ├── InputPage.jsx
│   │   └── CalendarPage.jsx
│   └── package.json
└── README.md
```

## API 文档

启动后端后，访问 `http://localhost:8000/docs` 查看交互式 API 文档。

