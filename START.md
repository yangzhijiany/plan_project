# 启动指南

## 启动步骤

### 1. 启动后端服务器

打开第一个终端窗口：

```bash
# 进入后端目录
cd /Users/jerry.yang/plan_project/backend

# 激活虚拟环境
source venv/bin/activate

# 启动后端服务器
uvicorn main:app --reload
```

**成功标志**：看到类似以下输出：
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

后端将在 `http://localhost:8000` 运行。

### 2. 启动前端服务器

打开第二个终端窗口（保持后端运行）：

```bash
# 进入前端目录
cd /Users/jerry.yang/plan_project/frontend

# 安装依赖（如果还没安装）
npm install

# 启动前端开发服务器
npm run dev
```

**成功标志**：看到类似以下输出：
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

前端将在 `http://localhost:5173` 运行。

### 3. 访问应用

在浏览器中打开：http://localhost:5173

## 快速启动脚本

### 后端启动脚本

```bash
cd backend
./start.sh
```

### 前端启动脚本

```bash
cd frontend
./start.sh
```

## 验证服务运行

### 检查后端
访问：http://localhost:8000

应该看到：
```json
{"message": "LLM Task Planner API"}
```

访问 API 文档：http://localhost:8000/docs

### 检查前端
访问：http://localhost:5173

应该看到任务输入页面。

## 常见问题

### 后端启动失败

1. **端口被占用**：
   ```bash
   # 检查端口占用
   lsof -i :8000
   # 杀死占用进程
   kill -9 <PID>
   ```

2. **依赖未安装**：
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **API Key 未设置**：
   ```bash
   # 检查 .env 文件
   cat backend/.env
   ```

### 前端启动失败

1. **依赖未安装**：
   ```bash
   cd frontend
   npm install
   ```

2. **端口被占用**：
   ```bash
   # 检查端口占用
   lsof -i :5173
   # 或修改 vite.config.js 中的端口
   ```

3. **Node.js 版本问题**：
   ```bash
   # 检查 Node.js 版本（需要 16+）
   node --version
   ```

### 前端无法连接后端

1. **检查后端是否运行**：
   - 访问 http://localhost:8000
   - 应该看到 API 响应

2. **检查 CORS 配置**：
   - 后端已配置 CORS，允许 localhost:5173
   - 如果修改了端口，需要更新后端的 CORS 配置

## 停止服务

### 停止后端
在后端终端按 `Ctrl + C`

### 停止前端
在前端终端按 `Ctrl + C`

## 开发模式

### 后端热重载
使用 `--reload` 参数后，后端代码修改后会自动重启。

### 前端热重载
Vite 默认支持热重载，代码修改后浏览器会自动刷新。

## 下一步

1. ✅ 启动后端服务器
2. ✅ 启动前端服务器
3. ✅ 访问 http://localhost:5173
4. ✅ 输入任务信息并生成计划
5. ✅ 查看日历视图

祝你使用愉快！🎉

