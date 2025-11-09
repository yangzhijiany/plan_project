# Railway 部署修复：前端未构建问题

## 问题

部署后只显示 `{"message":"LLM Task Planner API"}`，日志显示：
- `Frontend directory: /app/frontend/dist`
- `Exists: True, Has files: False`

## 原因

Railway 没有执行前端构建，或者构建失败。

## 解决方案

### 方案 1：使用 release 命令（当前配置）

**Procfile:**
```
release: cd frontend && npm ci && npm run build || echo "Frontend build failed, continuing..."
web: cd backend && python -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()" && uvicorn main:app --host 0.0.0.0 --port $PORT
```

Railway 会在部署前执行 `release` 命令构建前端。

### 方案 2：分开部署（最可靠）

#### 后端服务

1. 在 Railway 创建新服务
2. 根目录：项目根目录
3. **移除前端构建步骤**
4. 启动命令：`cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. 环境变量：
   - `OPENAI_API_KEY=your_key`
   - `ALLOWED_ORIGINS=*` 或前端域名

#### 前端服务

1. 在 Railway 创建新服务
2. 根目录：`frontend`
3. Railway 会自动检测 Node.js 项目
4. 构建命令：自动执行 `npm install && npm run build`
5. 启动命令：`npx serve -s dist -l $PORT`
6. 环境变量：
   - `VITE_API_BASE_URL=https://your-backend.railway.app`

### 方案 3：手动构建（如果 release 不工作）

如果 Railway 的 `release` 命令不执行，可以：

1. **在本地构建前端**：
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **提交构建后的文件**（不推荐，但可以临时解决）：
   ```bash
   git add frontend/dist
   git commit -m "Add built frontend files"
   git push origin main
   ```

3. **在 Railway 使用构建后的文件**

## 验证步骤

### 1. 检查 Railway 构建日志

查看是否有：
- `npm ci` 执行
- `npm run build` 执行
- 构建成功消息

### 2. 检查文件

在 Railway 控制台运行：
```bash
ls -la frontend/dist
cat frontend/dist/index.html
```

### 3. 检查后端日志

应该看到：
- `✅ Frontend built successfully: X files`
- 或 `⚠️  Directory is empty`

## 当前配置

### Procfile
```
release: cd frontend && npm ci && npm run build || echo "Frontend build failed, continuing..."
web: cd backend && python -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()" && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### package.json（根目录）
- 指定 Node.js 版本要求
- Railway 会自动检测并安装 Node.js

### 后端代码
- 自动检测多个可能的前端目录路径
- 详细的构建状态日志
- 如果前端未构建，显示调试信息

## 如果仍然失败

### 选项 1：检查 Railway 设置

1. 在 Railway 项目设置中
2. 确保构建命令正确
3. 检查是否有构建日志

### 选项 2：分开部署

这是最可靠的方法：
1. 后端服务：只部署 Python 后端
2. 前端服务：单独部署 React 前端
3. 配置 CORS 连接两者

### 选项 3：使用其他平台部署前端

- **Vercel**：专门用于前端部署
- **Netlify**：也支持前端部署
- **Cloudflare Pages**：免费且快速

## 推荐操作

1. **提交当前更改**：
   ```bash
   git add .
   git commit -m "Fix Railway deployment: ensure frontend is built"
   git push origin main
   ```

2. **在 Railway 检查**：
   - 查看构建日志
   - 确认 `release` 命令执行
   - 确认前端构建成功

3. **如果仍然失败**：
   - 考虑分开部署前端和后端
   - 或使用 Vercel/Netlify 部署前端

## 分开部署步骤（推荐）

### 后端服务

1. 创建新服务
2. 根目录：项目根目录
3. 启动命令：`cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
4. 环境变量：
   - `OPENAI_API_KEY`
   - `ALLOWED_ORIGINS=https://your-frontend.railway.app`

### 前端服务

1. 创建新服务
2. 根目录：`frontend`
3. 构建命令：自动（Railway 检测到 package.json）
4. 启动命令：`npx serve -s dist -l $PORT`
5. 环境变量：
   - `VITE_API_BASE_URL=https://your-backend.railway.app`

这样更可靠，因为每个服务只负责自己的部分。

