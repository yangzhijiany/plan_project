# Docker 部署指南

## Railway 使用 Docker 部署

Railway 支持直接使用 Dockerfile 部署，这比使用 Procfile 更可靠。

## 当前配置

### Dockerfile

- **多阶段构建**：
  - 第一阶段：使用 Node.js 构建前端
  - 第二阶段：使用 Python 运行后端
- **自动构建前端**：前端会在 Docker 构建时自动构建
- **自动初始化数据库**：数据库在容器启动时自动初始化

### Railway 配置

Railway 会自动检测 `Dockerfile` 并使用它来构建和部署。

## 部署步骤

### 1. 提交代码

```bash
git add .
git commit -m "Add Docker support for Railway deployment"
git push origin main
```

### 2. 在 Railway 配置

1. **Railway 会自动检测 Dockerfile**
2. **设置环境变量**：
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ALLOWED_ORIGINS=https://your-app.railway.app
   DATABASE_URL=postgresql://... (如果使用 PostgreSQL)
   ```

3. **Railway 会自动**：
   - 构建 Docker 镜像
   - 运行容器
   - 暴露端口

### 3. 验证部署

1. 查看构建日志：确认前端构建成功
2. 查看启动日志：确认后端启动成功
3. 访问 URL：应该看到前端界面

## 本地测试

### 构建镜像

```bash
docker build -t llm-task-planner .
```

### 运行容器

```bash
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=your_key \
  -e ALLOWED_ORIGINS=http://localhost:5173 \
  llm-task-planner
```

### 使用 docker-compose

```bash
# 创建 .env 文件
echo "OPENAI_API_KEY=your_key" > .env

# 启动服务
docker-compose up
```

## 优势

1. **环境一致性**：Docker 确保开发和生产环境一致
2. **依赖隔离**：所有依赖都在容器内
3. **易于调试**：可以在本地完全复现生产环境
4. **Railway 支持**：Railway 原生支持 Docker

## 故障排查

### 构建失败

**检查**：
- Dockerfile 语法
- 依赖安装是否成功
- 前端构建是否成功

**解决**：
- 查看构建日志
- 在本地测试构建：`docker build -t test .`

### 容器启动失败

**检查**：
- 环境变量是否正确
- 端口是否正确暴露
- 数据库连接是否正常

**解决**：
- 查看容器日志：`docker logs <container_id>`
- 检查环境变量
- 测试数据库连接

### 前端未显示

**检查**：
- 前端是否构建成功
- `frontend/dist` 目录是否有文件
- 后端是否正确服务静态文件

**解决**：
- 查看构建日志中的前端构建部分
- 检查 Dockerfile 中的前端复制步骤
- 查看后端启动日志

## 数据库持久化

### SQLite（开发）

数据存储在容器内的 `/app/backend/plans.db`。

### PostgreSQL（生产推荐）

1. 在 Railway 添加 PostgreSQL 数据库
2. Railway 会自动设置 `DATABASE_URL` 环境变量
3. 后端会自动使用 PostgreSQL

## 更新部署

每次推送到 GitHub，Railway 会自动：
1. 重新构建 Docker 镜像
2. 停止旧容器
3. 启动新容器

## 本地开发

### 不使用 Docker

```bash
# 后端
cd backend
source venv/bin/activate
uvicorn main:app --reload

# 前端（新终端）
cd frontend
npm run dev
```

### 使用 Docker

```bash
docker-compose up
```

## 下一步

1. 提交 Docker 配置
2. 推送到 GitHub
3. Railway 自动部署
4. 验证部署成功

