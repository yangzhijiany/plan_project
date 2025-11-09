# 安装问题修复说明

## 问题描述

在 Python 3.13 环境下安装依赖时，`pydantic-core` 编译失败，错误信息：
```
ERROR: Failed building wheel for pydantic-core
TypeError: ForwardRef._evaluate() missing 1 required keyword-only argument: 'recursive_guard'
```

## 解决方案

### 1. 更新依赖版本

已将所有依赖更新到支持 Python 3.13 的最新版本：

- `fastapi`: 0.104.1 → 0.115.0
- `uvicorn`: 0.24.0 → 0.32.0
- `sqlalchemy`: 2.0.23 → 2.0.36
- `openai`: 1.3.7 → 1.54.3
- `python-dotenv`: 1.0.0 → 1.0.1
- `pydantic`: 2.5.0 → 2.9.2

### 2. 修改代码兼容性

- 修改了 OpenAI 客户端的初始化方式，改为延迟初始化
- 避免在导入模块时就需要 API key
- 现在可以在没有 API key 的情况下启动服务器（但在调用 API 时需要）

### 3. 安装步骤

```bash
# 进入后端目录
cd backend

# 激活虚拟环境
source venv/bin/activate

# 升级 pip 和工具
pip install --upgrade pip setuptools wheel

# 安装依赖
pip install -r requirements.txt
```

## 验证安装

运行以下命令验证安装是否成功：

```bash
# 验证代码可以正常导入
python -c "from main import app; print('✅ 后端代码导入成功')"

# 启动服务器（需要先设置 OPENAI_API_KEY）
uvicorn main:app --reload
```

## 注意事项

1. **Python 版本**: 现在支持 Python 3.13，但也兼容 Python 3.11 和 3.12
2. **API Key**: 需要在 `.env` 文件中设置 `OPENAI_API_KEY` 才能使用生成计划功能
3. **预编译包**: 新版本的依赖已经提供了 Python 3.13 的预编译 wheel 包，无需从源码编译

## 如果还有问题

如果仍然遇到安装问题，可以尝试：

1. **使用 Python 3.11 或 3.12**:
   ```bash
   # 删除现有虚拟环境
   rm -rf venv
   
   # 使用 Python 3.11 创建新的虚拟环境
   python3.11 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **清理缓存后重新安装**:
   ```bash
   pip cache purge
   pip install --no-cache-dir -r requirements.txt
   ```

3. **检查系统依赖**:
   - macOS: 确保安装了 Xcode Command Line Tools
   - Linux: 确保安装了 build-essential

