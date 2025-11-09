# Railway 快速部署指南

## 前置要求

1. Railway 账号：https://railway.app
2. GitHub 账号
3. OpenAI API Key

## 快速部署步骤

### 1. 准备代码仓库

确保代码已推送到 GitHub：

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. 创建 Railway 项目

1. 访问 https://railway.app 并登录
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择您的代码仓库
5. Railway 会自动检测项目类型

### 3. 配置环境变量

在 Railway 项目设置中添加以下环境变量：

#### 后端服务环境变量

```
OPENAI_API_KEY=your_openai_api_key_here
ALLOWED_ORIGINS=https://your-frontend-domain.railway.app
PORT=8000
```

**注意**：
- `OPENAI_API_KEY`: 必需，您的 OpenAI API 密钥
- `ALLOWED_ORIGINS`: 前端域名，用逗号分隔多个域名
- `PORT`: Railway 会自动设置，通常不需要手动配置

### 4. 添加 PostgreSQL 数据库（推荐）

1. 在 Railway 项目中点击 "New" → "Database" → "Add PostgreSQL"
2. Railway 会自动创建 `DATABASE_URL` 环境变量
3. 后端会自动使用 PostgreSQL 数据库

### 5. 部署前端（如果分开部署）

如果需要单独部署前端：

1. 创建新的 Railway 服务
2. 根目录设置为 `frontend`
3. 构建命令：`npm install && npm run build`
4. 启动命令：`npx serve -s dist -l $PORT`
5. 环境变量：`VITE_API_BASE_URL=https://your-backend.railway.app`

### 6. 更新 CORS 设置

部署前端后，更新后端的 `ALLOWED_ORIGINS` 环境变量，包含前端域名。

## 部署方式选择

### 方式 A：后端 + 前端分离部署（推荐）

- **后端服务**：部署 Python FastAPI 应用
- **前端服务**：部署 React 静态文件
- **优势**：独立扩展，更好的性能

### 方式 B：单一服务部署

- 后端服务同时提供 API 和静态文件服务
- 需要修改代码以支持静态文件服务
- 适合小型应用

## 环境变量说明

### 后端环境变量

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | 是 | `sk-...` |
| `ALLOWED_ORIGINS` | CORS 允许的域名 | 否 | `https://app.railway.app` |
| `DATABASE_URL` | 数据库连接 URL | 否 | Railway 自动提供 |
| `PORT` | 服务端口 | 否 | Railway 自动设置 |

### 前端环境变量

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | 是 | `https://backend.railway.app` |

## 验证部署

1. 访问前端 URL
2. 创建/选择用户
3. 创建任务
4. 检查任务是否正常显示

## 故障排查

### CORS 错误

- 检查 `ALLOWED_ORIGINS` 是否包含前端域名
- 确保域名格式正确（包含 `https://`）

### 数据库连接失败

- 检查 `DATABASE_URL` 环境变量
- 确保 PostgreSQL 服务已启动
- 检查数据库迁移是否成功

### API 连接失败

- 检查 `VITE_API_BASE_URL` 环境变量
- 确保后端服务已启动
- 检查后端日志

## 下一步

- 配置自定义域名
- 设置 CI/CD
- 添加监控和告警
- 优化性能

## 更多信息

查看 `RAILWAY_DEPLOYMENT.md` 获取详细部署文档。

