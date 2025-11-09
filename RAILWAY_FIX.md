# Railway 部署问题修复

## 问题

如果遇到 `nodejs-20_x` 未定义的错误，说明 Nix 包名不正确。

## 解决方案

### 方案 1：删除 nixpacks.toml（推荐）

让 Railway 自动检测项目类型：

1. 删除 `nixpacks.toml` 文件
2. Railway 会自动检测 Python 项目
3. 确保 `Procfile` 存在且配置正确

### 方案 2：使用正确的包名

如果必须使用 `nixpacks.toml`，使用以下配置：

```toml
[phases.setup]
nixPkgs = ["python313", "nodejs_20"]

[phases.install]
cmds = [
  "pip install --upgrade pip",
  "pip install -r backend/requirements.txt",
  "cd frontend && npm install"
]

[phases.build]
cmds = [
  "cd backend && python -c \"import sys; sys.path.insert(0, '.'); from database import init_db; init_db()\"",
  "cd frontend && npm run build"
]

[start]
cmd = "cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT"
```

### 方案 3：简化配置（最推荐）

只使用 `Procfile`，让 Railway 自动处理：

**Procfile:**
```
web: cd backend && python -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()" && uvicorn main:app --host 0.0.0.0 --port $PORT
```

Railway 会自动：
- 检测 Python 项目
- 安装 requirements.txt 中的依赖
- 运行 Procfile 中的命令

## 推荐部署方式

### 后端服务

1. **删除** `nixpacks.toml`（如果存在）
2. **保留** `Procfile`
3. **确保** `backend/requirements.txt` 存在
4. Railway 会自动检测并部署

### 前端服务（如果需要分开部署）

1. 创建新的 Railway 服务
2. 根目录设置为 `frontend`
3. Railway 会自动检测 Node.js 项目
4. 构建命令会自动运行 `npm install && npm run build`
5. 需要配置启动命令：`npx serve -s dist -l $PORT`

## 环境变量

确保设置以下环境变量：

```
OPENAI_API_KEY=your_key_here
ALLOWED_ORIGINS=https://your-frontend.railway.app
```

## 数据库

如果使用 PostgreSQL：
1. 在 Railway 中添加 PostgreSQL 数据库
2. `DATABASE_URL` 会自动设置
3. 数据库会在启动时自动初始化

## 故障排查

如果仍然遇到问题：

1. **检查 Procfile 格式**：确保没有额外的空行
2. **检查 requirements.txt**：确保所有依赖都列出
3. **查看 Railway 日志**：检查具体的错误信息
4. **简化配置**：删除 nixpacks.toml，只使用 Procfile

## 当前推荐配置

**Procfile:**
```
web: cd backend && python -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()" && uvicorn main:app --host 0.0.0.0 --port $PORT
```

**backend/requirements.txt:**
```
fastapi==0.115.0
uvicorn[standard]==0.32.0
sqlalchemy==2.0.36
openai>=2.7.0
python-dotenv==1.0.1
pydantic==2.9.2
psycopg2-binary>=2.9.0
```

删除 `nixpacks.toml` 和 `railway.json`，让 Railway 自动检测。

