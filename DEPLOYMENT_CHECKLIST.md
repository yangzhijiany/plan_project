# Railway 部署检查清单

## 问题：只显示 `{"message":"LLM Task Planner API"}`

这表示前端没有被正确构建或服务。

## 已修复的问题

1. ✅ **删除了重复的 `/` 路由** - 之前有两个 `@app.get("/")` 路由，第一个会拦截所有请求
2. ✅ **添加了前端静态文件服务** - 后端现在可以服务前端构建后的文件
3. ✅ **更新了 Procfile** - 自动构建前端
4. ✅ **修复了 API 配置** - 生产环境使用相对路径

## 部署步骤

### 1. 提交代码

```bash
git add .
git commit -m "Fix Railway deployment: add frontend static file serving"
git push origin main
```

### 2. 在 Railway 配置

#### 环境变量

```
OPENAI_API_KEY=your_openai_api_key_here
ALLOWED_ORIGINS=https://your-app.railway.app
```

**注意**：如果前后端部署在同一服务，`ALLOWED_ORIGINS` 可以设置为 `*` 或当前域名。

#### 构建配置

Railway 会自动：
1. 检测到 `Procfile`
2. 执行 `build.sh` 构建前端
3. 启动后端服务

### 3. 验证部署

1. **查看构建日志**：
   - 应该看到 `npm install` 和 `npm run build` 成功
   - 应该看到 `✅ 构建完成！`

2. **查看启动日志**：
   - 应该看到 `✅ Frontend static files mounted from ...`
   - 如果看到 `⚠️  Frontend not built`，说明前端构建失败

3. **访问 URL**：
   - 应该看到前端界面
   - 不应该只看到 JSON 消息

## 如果仍然只显示 JSON

### 检查 1：前端是否构建

查看 Railway 构建日志，确认：
- `npm run build` 是否成功
- `frontend/dist` 目录是否有文件

### 检查 2：文件路径

后端日志会显示：
```
✅ Frontend static files mounted from /path/to/frontend/dist
```

如果看到：
```
⚠️  Frontend not built. Frontend directory: ...
```

说明前端未构建。

### 检查 3：Procfile 是否正确执行

确保 Railway 使用了 `Procfile`，而不是自动检测。

### 检查 4：手动构建测试

在本地测试：

```bash
cd frontend
npm install
npm run build
ls -la dist  # 应该看到 index.html 和 assets 目录
```

## 替代方案：分开部署

如果单一服务部署有问题，可以分开部署：

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
3. 构建命令：`npm install && npm run build`
4. 启动命令：`npx serve -s dist -l $PORT`
5. 环境变量：
   - `VITE_API_BASE_URL=https://your-backend.railway.app`

## 当前配置

### Procfile

```
web: bash build.sh && cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### build.sh

```bash
#!/bin/bash
set -e

# 构建前端
cd frontend
npm install
npm run build
cd ..

# 初始化数据库
cd backend
python -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()"
cd ..
```

### 后端代码

- 自动检测 `frontend/dist` 目录
- 如果存在，服务静态文件
- 如果不存在，返回 API 信息

## 故障排查命令

在 Railway 控制台运行：

```bash
# 检查前端目录
ls -la frontend/dist

# 检查文件
cat frontend/dist/index.html

# 检查后端日志
# 应该看到前端构建状态
```

## 下一步

1. 提交所有更改
2. 推送到 GitHub
3. Railway 自动重新部署
4. 检查构建和启动日志
5. 访问 URL 验证

