# Railway 白屏问题修复指南

## 问题症状

- 部署后只显示 `{"message":"LLM Task Planner API"}`
- 日志显示：`⚠️  Frontend not built. Frontend directory: /app/frontend/dist`
- `Exists: True, Has files: False` - 目录存在但为空

## 原因分析

1. **前端构建未执行**：Railway 可能没有正确构建前端
2. **构建失败**：前端构建过程中出错
3. **路径问题**：构建后的文件路径不正确

## 解决方案

### 方案 1：使用 release 命令（推荐）

Railway 支持 `release` 命令在部署前执行构建。

**Procfile:**
```
release: cd frontend && npm ci && npm run build
web: cd backend && python -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()" && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 方案 2：确保 Railway 检测到 Node.js 项目

创建根目录的 `package.json`：

```json
{
  "name": "llm-task-planner",
  "version": "1.0.0",
  "scripts": {
    "build": "cd frontend && npm install && npm run build"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 方案 3：分开部署（最可靠）

#### 步骤 1：部署后端

1. 创建新服务
2. 根目录：项目根目录
3. 环境变量：
   - `OPENAI_API_KEY`
   - `ALLOWED_ORIGINS=*`（如果前后端在同一域名）或前端域名
4. Railway 会自动检测 Python 项目

#### 步骤 2：部署前端

1. 创建新服务
2. 根目录：`frontend`
3. 构建命令：`npm install && npm run build`
4. 启动命令：`npx serve -s dist -l $PORT`
5. 环境变量：
   - `VITE_API_BASE_URL=https://your-backend.railway.app`

## 当前配置

### Procfile（已更新）

```
release: cd frontend && npm ci && npm run build
web: cd backend && python -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()" && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 后端代码（已更新）

- 自动检测多个可能的前端目录路径
- 详细的构建状态日志
- 如果前端未构建，显示详细的调试信息

## 验证步骤

### 1. 检查构建日志

在 Railway 构建日志中查找：
- `npm ci` 或 `npm install` 是否成功
- `npm run build` 是否成功
- 是否有错误信息

### 2. 检查文件

在 Railway 控制台运行：

```bash
ls -la frontend/dist
cat frontend/dist/index.html
```

### 3. 检查后端日志

后端启动时应显示：
- `✅ Frontend built successfully: X files`
- 或 `⚠️  Frontend not built...`

## 故障排查

### 问题 1：npm install 失败

**可能原因**：
- Node.js 版本不兼容
- 网络问题
- package.json 错误

**解决方法**：
- 在 Railway 设置中指定 Node.js 版本（20.x）
- 检查 `frontend/package.json`
- 使用 `npm ci` 而不是 `npm install`

### 问题 2：npm run build 失败

**可能原因**：
- 构建错误
- 依赖缺失
- 环境变量未设置

**解决方法**：
- 查看构建日志中的具体错误
- 在本地测试构建：`cd frontend && npm run build`
- 检查 `vite.config.js`

### 问题 3：文件路径不正确

**可能原因**：
- Railway 的工作目录不同
- 路径解析问题

**解决方法**：
- 后端代码已支持多个路径
- 检查日志中的实际路径
- 使用绝对路径 `/app/frontend/dist`

## 推荐部署方式

### 选项 A：单一服务（如果 release 命令工作）

1. 使用更新后的 `Procfile`
2. Railway 会在部署前执行 `release` 命令
3. 然后启动 `web` 服务

### 选项 B：分开部署（最可靠）

1. 后端服务：只部署 Python 后端
2. 前端服务：单独部署 React 前端
3. 配置 CORS 和环境变量

## 立即行动

1. **提交更改**：
   ```bash
   git add .
   git commit -m "Fix Railway deployment: add release command for frontend build"
   git push origin main
   ```

2. **在 Railway 检查**：
   - 查看构建日志
   - 确认 `release` 命令执行
   - 确认 `npm run build` 成功

3. **如果仍然失败**：
   - 考虑分开部署前端和后端
   - 或检查 Railway 的构建日志中的具体错误

## 调试命令

在 Railway 控制台运行：

```bash
# 检查 Node.js
node --version
npm --version

# 检查前端目录
cd frontend
ls -la
npm ci
npm run build
ls -la dist

# 检查后端
cd ../backend
python -c "from pathlib import Path; print(Path('../frontend/dist').exists())"
```

