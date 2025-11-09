# Railway 数据库配置说明

## 问题：数据在每次部署后丢失

如果你遇到每次部署后数据都消失的问题，**很可能是因为没有配置 PostgreSQL 数据库服务**。

### 原因

- 如果 Railway 上没有配置 PostgreSQL，应用会使用 SQLite（默认）
- SQLite 数据文件存储在容器内部
- 每次部署时，Railway 会创建新的容器
- 新容器中没有数据库文件，所以数据会丢失

### 解决方案：在 Railway 上配置 PostgreSQL

#### 步骤 1：添加 PostgreSQL 数据库服务

1. 在 Railway 控制台中，打开你的项目
2. 点击 **"+ New"** 按钮
3. 选择 **"Database"** → **"Add PostgreSQL"**
4. Railway 会自动创建 PostgreSQL 数据库服务

#### 步骤 2：绑定数据库服务

1. PostgreSQL 服务创建后，Railway 会自动：
   - 创建 `DATABASE_URL` 环境变量
   - 将数据库服务绑定到你的应用服务
2. 检查环境变量：
   - 进入你的应用服务
   - 点击 **"Variables"** 标签
   - 确认 `DATABASE_URL` 存在（格式类似：`postgres://user:password@host:port/dbname`）

#### 步骤 3：重新部署

1. 重新部署应用
2. 查看日志，应该看到：
   ```
   ✅ 使用 PostgreSQL 数据库: host:port/dbname
   ```
   而不是：
   ```
   ⚠️  警告：正在使用 SQLite 数据库
   ```

### 验证配置

部署后，查看应用日志：

**正确的日志（使用 PostgreSQL）：**
```
✅ 使用 PostgreSQL 数据库: xxxxxx.railway.app:5432/railway
🔹 正在初始化数据库...
```

**错误的日志（使用 SQLite）：**
```
⚠️  警告：正在使用 SQLite 数据库
⚠️  SQLite 数据存储在容器中，每次部署都会丢失数据！
⚠️  请确保在 Railway 上配置了 PostgreSQL 数据库服务
```

### 注意事项

1. **PostgreSQL 数据是持久化的**：数据存储在 Railway 的数据库服务中，不会因为部署而丢失
2. **环境变量自动配置**：Railway 会自动设置 `DATABASE_URL`，无需手动配置
3. **免费额度**：Railway 提供免费的 PostgreSQL 数据库（有使用限制）

### 故障排查

如果配置了 PostgreSQL 但数据仍然丢失：

1. **检查环境变量**：
   - 确认 `DATABASE_URL` 环境变量存在
   - 确认格式正确（以 `postgres://` 或 `postgresql://` 开头）

2. **检查服务绑定**：
   - 确认 PostgreSQL 服务已绑定到应用服务
   - 在 Railway 控制台中，应用服务应该显示数据库连接

3. **查看日志**：
   - 部署后查看应用日志
   - 确认使用的是 PostgreSQL 而不是 SQLite

4. **测试连接**：
   - 在 Railway 控制台中，打开 PostgreSQL 服务
   - 使用 "Query" 功能测试数据库连接
   - 检查表是否存在：`SELECT * FROM users;`

### 迁移现有数据

如果你的应用已经在使用 SQLite，并且有重要数据：

1. **导出 SQLite 数据**（如果可能）：
   ```bash
   sqlite3 plans.db .dump > backup.sql
   ```

2. **配置 PostgreSQL**（按照上面的步骤）

3. **导入数据到 PostgreSQL**（如果需要）：
   - 使用 Railway 的 PostgreSQL Query 功能
   - 或者使用 psql 客户端连接并导入数据

### 总结

- ✅ **使用 PostgreSQL**：数据持久化，不会丢失
- ❌ **使用 SQLite**：数据存储在容器中，每次部署都会丢失

**重要**：确保在 Railway 上配置了 PostgreSQL 数据库服务，这样数据才会持久保存。

