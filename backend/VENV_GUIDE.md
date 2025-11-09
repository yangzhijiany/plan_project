# Python 虚拟环境使用指南

## macOS/Linux 系统

### 创建虚拟环境
```bash
cd backend
python3 -m venv venv
```

### 激活虚拟环境
```bash
source venv/bin/activate
```

激活后，命令行提示符会显示 `(venv)`，例如：
```
(venv) user@computer:~/plan_project/backend$
```

### 退出虚拟环境
```bash
deactivate
```

### 一键设置（推荐）
```bash
cd backend
./setup_venv.sh
```

这个脚本会自动：
1. 创建虚拟环境
2. 激活虚拟环境
3. 升级 pip
4. 安装所有依赖

## Windows 系统

### 创建虚拟环境
```bash
cd backend
python -m venv venv
```

### 激活虚拟环境
```bash
venv\Scripts\activate
```

### 退出虚拟环境
```bash
deactivate
```

## 常用命令

### 检查虚拟环境是否激活
```bash
which python  # macOS/Linux
where python  # Windows
```

激活后应该显示虚拟环境路径，例如：
```
/Users/jerry.yang/plan_project/backend/venv/bin/python
```

### 查看已安装的包
```bash
pip list
```

### 安装依赖
```bash
pip install -r requirements.txt
```

### 启动后端服务器（在虚拟环境中）
```bash
uvicorn main:app --reload
```

## 注意事项

1. **每次使用前都需要激活虚拟环境**
   - 打开新终端时，需要重新激活
   - 激活后可以在该终端会话中直接使用

2. **虚拟环境是项目隔离的**
   - 每个项目应该有自己独立的虚拟环境
   - 不要将 `venv/` 文件夹提交到 Git（已在 .gitignore 中）

3. **如果遇到权限问题**
   ```bash
   chmod +x setup_venv.sh  # macOS/Linux
   ```

4. **Python 版本要求**
   - 需要 Python 3.8 或更高版本
   - 检查版本：`python3 --version`

## 故障排除

### 问题：command not found: python3
**解决方案**：
- macOS: 安装 Python: `brew install python3`
- 或使用 `python` 代替 `python3`

### 问题：无法激活虚拟环境
**解决方案**：
```bash
# 删除旧的虚拟环境并重新创建
rm -rf venv
python3 -m venv venv
source venv/bin/activate
```

### 问题：pip 安装失败
**解决方案**：
```bash
# 升级 pip
pip install --upgrade pip
# 然后重新安装依赖
pip install -r requirements.txt
```

