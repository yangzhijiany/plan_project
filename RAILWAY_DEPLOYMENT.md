# Railway 部署指南

本指南将帮助您将 LLM Task Planner 应用部署到 Railway 平台。

## 部署策略

Railway 支持两种部署方式：
1. **单一服务部署**：将前端和后端部署在同一个服务中（推荐用于简单项目）
2. **多服务部署**：将前端和后端分别部署为两个服务（推荐用于生产环境）

本指南将介绍两种方式。

## 方式一：单一服务部署（推荐）

### 前置要求

1. Railway 账号（https://railway.app）
2. GitHub 账号（用于连接代码仓库）
3. OpenAI API Key

### 步骤 1：准备代码

1. 确保代码已推送到 GitHub 仓库
2. 确保 `.gitignore` 文件排除了以下内容：
   - `backend/venv/`
   - `backend/plans.db`
   - `node_modules/`
   - `.env` 文件

### 步骤 2：创建 Railway 项目

1. 登录 Railway (https://railway.app)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择您的代码仓库

### 步骤 3：配置环境变量

在 Railway 项目设置中添加以下环境变量：

```
OPENAI_API_KEY=your_openai_api_key_here
ALLOWED_ORIGINS=https://your-app.railway.app,https://your-frontend.railway.app
PORT=8000
```

**注意**：
- `OPENAI_API_KEY`: 您的 OpenAI API 密钥
- `ALLOWED_ORIGINS`: 允许访问后端的域名，用逗号分隔
- `PORT`: Railway 会自动设置，通常不需要手动配置

### 步骤 4：配置数据库

Railway 会自动提供一个 PostgreSQL 数据库（如果需要）。您可以选择：

**选项 A：使用 Railway 的 PostgreSQL（推荐生产环境）**
1. 在 Railway 项目中点击 "New" → "Database" → "Add PostgreSQL"
2. Railway 会自动创建 `DATABASE_URL` 环境变量
3. 后端会自动使用 PostgreSQL 数据库

**选项 B：使用 SQLite（简单但不适合生产环境）**
- 不需要额外配置，但数据不会持久化

### 步骤 5：配置构建和启动

Railway 会自动检测项目类型。如果自动检测失败，可以使用 `nixpacks.toml` 配置文件。

### 步骤 6：部署前端

由于前端需要单独部署，您有两个选择：

**选项 A：使用 Railway 的静态文件服务**
1. 在 Railway 项目中添加新服务
2. 选择 "Empty Service"
3. 配置构建命令：`cd frontend && npm install && npm run build`
4. 配置启动命令：`npx serve -s frontend/dist -l $PORT`
5. 添加环境变量：`VITE_API_BASE_URL=https://your-backend.railway.app`

**选项 B：使用 Vercel/Netlify 部署前端（推荐）**
1. 将前端部署到 Vercel 或 Netlify
2. 在部署时设置环境变量 `VITE_API_BASE_URL` 为后端 URL
3. 更新后端的 `ALLOWED_ORIGINS` 包含前端域名

## 方式二：多服务部署（生产环境推荐）

### 后端服务

1. 创建新的 Railway 服务
2. 选择后端目录作为根目录
3. 配置环境变量：
   - `OPENAI_API_KEY`
   - `DATABASE_URL` (如果使用 PostgreSQL)
   - `ALLOWED_ORIGINS`
4. Railway 会自动检测 Python 项目并安装依赖

### 前端服务

1. 创建新的 Railway 服务
2. 选择前端目录作为根目录
3. 配置构建命令：`npm install && npm run build`
4. 配置启动命令：`npx serve -s dist -l $PORT`
5. 配置环境变量：
   - `VITE_API_BASE_URL=https://your-backend.railway.app`

## 环境变量说明

### 后端环境变量

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | 是 | - |
| `ALLOWED_ORIGINS` | 允许的 CORS 来源 | 否 | `http://localhost:5173,http://127.0.0.1:5173` |
| `DATABASE_URL` | 数据库连接 URL | 否 | `sqlite:///./plans.db` |
| `PORT` | 服务端口 | 否 | Railway 自动设置 |

### 前端环境变量

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | 是（生产环境） | `http://localhost:8000` |

## 数据库迁移

如果使用 PostgreSQL，需要运行数据库迁移：

1. 连接到 Railway 服务
2. 运行迁移命令：
   ```bash
   railway run python backend/database.py
   ```

或者直接在代码中初始化数据库（已自动处理）。

## 故障排查

### 问题 1：CORS 错误

**解决方案**：
- 检查 `ALLOWED_ORIGINS` 环境变量是否包含前端域名
- 确保域名格式正确（包含 `https://`）

### 问题 2：数据库连接失败

**解决方案**：
- 检查 `DATABASE_URL` 环境变量是否正确
- 如果使用 PostgreSQL，确保数据库服务已启动
- 检查数据库 URL 格式（Railway 的 PostgreSQL URL 需要将 `postgres://` 替换为 `postgresql://`）

### 问题 3：前端无法连接后端

**解决方案**：
- 检查 `VITE_API_BASE_URL` 环境变量是否正确
- 确保后端服务已启动
- 检查后端日志是否有错误

### 问题 4：构建失败

**解决方案**：
- 检查 `requirements.txt` 和 `package.json` 是否正确
- 查看 Railway 构建日志
- 确保所有依赖都已正确声明

## 更新部署

每次推送到 GitHub 主分支，Railway 会自动重新部署。

## 监控和日志

- 在 Railway  dashboard 中查看服务日志
- 使用 Railway 的监控功能查看服务状态
- 设置告警通知

## 成本估算

Railway 提供免费额度：
- $5 免费额度每月
- 超出后按使用量计费

对于小型应用，通常可以免费使用。

## 安全建议

1. **不要提交敏感信息**：确保 `.env` 文件在 `.gitignore` 中
2. **使用环境变量**：所有敏感信息通过环境变量传递
3. **启用 HTTPS**：Railway 自动提供 HTTPS
4. **限制 CORS**：只允许必要的域名访问后端
5. **定期更新依赖**：保持依赖包更新以修复安全漏洞

## 支持

如果遇到问题，可以：
1. 查看 Railway 文档：https://docs.railway.app
2. 查看项目 README.md
3. 检查 Railway 服务日志

## 下一步

部署成功后，您可以：
1. 配置自定义域名
2. 设置 CI/CD 流程
3. 添加监控和告警
4. 优化性能和成本

