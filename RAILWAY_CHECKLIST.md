# Railway 部署检查清单

## ✅ 已完成的优化

1. ✅ **Dockerfile 优化**
   - 多阶段构建
   - 正确的 WORKDIR 设置
   - entrypoint.sh 脚本

2. ✅ **entrypoint.sh 优化**
   - 添加了 PORT 环境变量处理
   - 添加了详细的日志输出
   - 确保数据库初始化

3. ✅ **数据库配置**
   - 支持 PostgreSQL（Railway）
   - 支持 SQLite（本地开发）
   - 自动转换数据库 URL

## 🔍 Railway 部署前检查

### 1. 环境变量设置

在 Railway 项目设置中，确保设置以下环境变量：

```
OPENAI_API_KEY=your_openai_api_key
ALLOWED_ORIGINS=https://your-app.railway.app
DATABASE_URL=postgresql://... (如果使用 PostgreSQL)
PORT=8000 (Railway 会自动设置，但可以手动设置)
```

### 2. 数据库设置

**选项 A：使用 Railway PostgreSQL（推荐）**
1. 在 Railway 项目中添加 PostgreSQL 服务
2. Railway 会自动设置 `DATABASE_URL` 环境变量
3. 数据库会在应用启动时自动初始化

**选项 B：使用 SQLite（不推荐用于生产）**
- 数据会存储在容器中，重启后可能丢失
- 仅在测试时使用

### 3. 端口设置

- Railway 会自动设置 `PORT` 环境变量
- 应用会读取 `PORT` 环境变量
- 如果未设置，默认使用 8000

### 4. 前端静态文件

- 前端在 Docker 构建时自动构建
- 静态文件位于 `/app/frontend/dist`
- 后端会自动服务这些文件

## 🚨 常见问题排查

### 问题 1：容器启动失败

**检查**：
- Railway 部署日志
- 查看是否有错误信息
- 检查环境变量是否正确设置

**解决**：
- 确保 `OPENAI_API_KEY` 已设置
- 检查数据库连接
- 查看 entrypoint.sh 的输出

### 问题 2：端口问题

**检查**：
- Railway 是否自动设置了 `PORT` 环境变量
- 应用是否监听正确的端口

**解决**：
- 查看 Railway 部署日志中的端口信息
- 确保应用监听 `0.0.0.0:${PORT}`

### 问题 3：数据库连接失败

**检查**：
- `DATABASE_URL` 环境变量是否正确
- PostgreSQL 服务是否正常运行
- 数据库 URL 格式是否正确（postgresql:// 而不是 postgres://）

**解决**：
- 检查 Railway PostgreSQL 服务状态
- 验证 `DATABASE_URL` 格式
- 查看数据库初始化日志

### 问题 4：前端未显示

**检查**：
- 前端是否成功构建（查看 Docker 构建日志）
- `frontend/dist` 目录是否存在
- 后端是否正确服务静态文件

**解决**：
- 查看 Docker 构建日志中的前端构建部分
- 检查 `frontend/dist` 目录内容
- 查看后端启动日志中的前端目录信息

## 📋 部署步骤

1. **提交代码**：
   ```bash
   git add .
   git commit -m "Fix Railway deployment"
   git push origin main
   ```

2. **在 Railway 中**：
   - 等待自动部署
   - 或手动触发部署

3. **检查部署日志**：
   - 查看构建日志
   - 查看启动日志
   - 确认没有错误

4. **验证部署**：
   - 访问 Railway 提供的 URL
   - 测试应用功能
   - 检查数据库连接

## 🔧 调试技巧

### 查看 Railway 日志

1. 在 Railway 项目页面
2. 点击 "Deployments"
3. 点击最新的部署
4. 查看 "Build Logs" 和 "Runtime Logs"

### 本地测试 Railway 环境

```bash
# 设置环境变量
export PORT=8000
export DATABASE_URL=postgresql://user:pass@host:port/db
export OPENAI_API_KEY=your_key

# 运行 Docker 容器
docker run -p 8000:8000 \
  -e PORT=$PORT \
  -e DATABASE_URL=$DATABASE_URL \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  your-image-name
```

### 检查容器内部

```bash
# 进入运行中的容器
docker exec -it <container_id> /bin/sh

# 检查文件
ls -la /app/backend
ls -la /app/frontend/dist

# 检查环境变量
env | grep PORT
env | grep DATABASE_URL
```

## 📞 如果仍然有问题

1. **查看 Railway 日志**：详细的错误信息
2. **检查 Railway 状态**：https://status.railway.app/
3. **联系 Railway 支持**：support@railway.app
4. **提供以下信息**：
   - 项目名称
   - 部署 ID
   - 错误日志
   - 环境变量配置（隐藏敏感信息）

