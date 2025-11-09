# Railway 分开部署指南（推荐方案）

## 为什么分开部署？

- ✅ 更可靠：每个服务只负责自己的部分
- ✅ 更容易调试：问题隔离
- ✅ 更好的扩展性：可以独立扩展
- ✅ Railway 自动检测项目类型

## 部署步骤

### 步骤 1：部署后端服务

1. **在 Railway 创建新服务**
   - 点击 "New" → "GitHub Repo"
   - 选择您的仓库

2. **配置服务**
   - 根目录：项目根目录（默认）
   - Railway 会自动检测 Python 项目

3. **环境变量**
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ALLOWED_ORIGINS=https://your-frontend.railway.app
   ```

4. **启动命令**（如果需要）
   ```
   cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

5. **获取后端 URL**
   - Railway 会提供一个 URL，例如：`https://backend-production-xxxx.up.railway.app`
   - 记下这个 URL

### 步骤 2：部署前端服务

1. **在 Railway 创建新服务**
   - 点击 "New" → "GitHub Repo"
   - 选择同一个仓库

2. **配置服务**
   - 根目录：`frontend`
   - Railway 会自动检测 Node.js 项目

3. **环境变量**
   ```
   VITE_API_BASE_URL=https://your-backend.railway.app
   ```
   （使用步骤 1 中的后端 URL）

4. **构建和启动**
   - Railway 会自动：
     - 运行 `npm install`
     - 运行 `npm run build`
   - 启动命令：`npx serve -s dist -l $PORT`

5. **获取前端 URL**
   - Railway 会提供一个 URL，例如：`https://frontend-production-yyyy.up.railway.app`

### 步骤 3：更新 CORS 设置

1. **更新后端环境变量**
   - 在后端服务设置中
   - 更新 `ALLOWED_ORIGINS`：
     ```
     ALLOWED_ORIGINS=https://your-frontend.railway.app
     ```
   - 使用步骤 2 中的前端 URL

2. **重新部署后端**
   - Railway 会自动重新部署

## 验证部署

1. **访问前端 URL**
   - 应该看到前端界面
   - 不应该只看到 JSON

2. **测试功能**
   - 创建用户
   - 创建任务
   - 查看日历

## 故障排查

### 前端无法连接后端

**检查**：
- `VITE_API_BASE_URL` 环境变量是否正确
- 后端 URL 是否可访问
- CORS 设置是否正确

**解决**：
- 检查环境变量
- 更新 `ALLOWED_ORIGINS`
- 查看浏览器控制台错误

### 后端 CORS 错误

**检查**：
- `ALLOWED_ORIGINS` 是否包含前端域名
- 域名格式是否正确（包含 `https://`）

**解决**：
- 更新 `ALLOWED_ORIGINS` 环境变量
- 重新部署后端

## 优势

1. **可靠性**：每个服务独立，不会互相影响
2. **易调试**：问题隔离，更容易找到问题
3. **可扩展**：可以独立扩展每个服务
4. **Railway 优化**：Railway 会自动优化每个服务的构建和部署

## 成本

Railway 免费额度：
- $5 免费额度每月
- 两个服务通常可以在免费额度内运行

## 下一步

1. 按照上述步骤部署
2. 测试功能
3. 配置自定义域名（可选）

