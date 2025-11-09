# Railway 部署前端问题修复

## 问题

部署后只显示 `{"message":"LLM Task Planner API"}`，没有看到前端界面。

## 原因

1. **前端未构建**：Railway 只部署了后端，没有构建前端
2. **路由顺序问题**：`@app.get("/")` 路由可能拦截了所有请求
3. **静态文件未服务**：前端构建后的文件没有被正确服务

## 解决方案

### 方案 1：修改 Procfile 自动构建前端（推荐）

当前的 `Procfile` 已经包含前端构建步骤：

```
web: cd frontend && npm install && npm run build && cd ../backend && python -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()" && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 方案 2：分开部署前端和后端（生产环境推荐）

#### 后端服务

1. 在 Railway 创建后端服务
2. 环境变量：
   - `OPENAI_API_KEY=your_key`
   - `ALLOWED_ORIGINS=https://your-frontend.railway.app`
3. Railway 会自动检测 Python 项目并部署

#### 前端服务

1. 在 Railway 创建新服务
2. 根目录：`frontend`
3. 构建命令：`npm install && npm run build`
4. 启动命令：`npx serve -s dist -l $PORT`
5. 环境变量：
   - `VITE_API_BASE_URL=https://your-backend.railway.app`

## 验证部署

### 检查前端是否构建

1. 查看 Railway 构建日志
2. 确认看到 `npm run build` 成功执行
3. 确认 `frontend/dist` 目录有文件

### 检查后端日志

后端启动时会显示：
- `✅ Frontend static files mounted from ...` - 前端已构建
- `⚠️  Frontend not built. ...` - 前端未构建

### 测试

1. 访问 Railway URL
2. 应该看到前端界面，而不是 JSON 消息
3. 如果仍看到 JSON，检查 Railway 日志

## 故障排查

### 问题 1：前端构建失败

**检查**：
- Railway 构建日志
- `package.json` 是否正确
- Node.js 版本是否兼容

**解决**：
- 在 Railway 设置中指定 Node.js 版本
- 检查 `frontend/package.json` 中的依赖

### 问题 2：前端构建成功但未显示

**检查**：
- 后端日志中的前端目录路径
- `frontend/dist` 目录是否存在
- 文件权限是否正确

**解决**：
- 确认 `Procfile` 中的构建命令正确执行
- 检查文件路径是否正确

### 问题 3：API 请求失败

**检查**：
- 前端 `config.js` 中的 API 地址
- CORS 配置
- 后端日志

**解决**：
- 如果前后端在同一域名，使用相对路径（空字符串）
- 如果分开部署，设置 `VITE_API_BASE_URL` 环境变量

## 当前配置

### Procfile

```
web: cd frontend && npm install && npm run build && cd ../backend && python -c "import sys; sys.path.insert(0, '.'); from database import init_db; init_db()" && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 后端代码

- 自动检测前端是否构建
- 如果构建，服务静态文件
- 如果未构建，返回 API 信息

### 前端配置

- 开发环境：使用 `http://localhost:8000`
- 生产环境：使用相对路径（空字符串），与后端在同一域名

## 下一步

1. 提交代码更改
2. 推送到 GitHub
3. Railway 会自动重新部署
4. 检查部署日志
5. 访问 URL 验证

## 如果仍然有问题

1. **查看 Railway 日志**：检查构建和启动日志
2. **检查环境变量**：确保所有必需的环境变量已设置
3. **验证文件路径**：确认 `frontend/dist` 目录存在
4. **测试本地构建**：在本地运行 `npm run build` 确认可以构建

