# Railway 部署卡住问题排查

## 问题
Railway 卡在 "Initialization › Taking a snapshot of the code..." 步骤

## 可能原因

1. **代码仓库太大**：项目包含大量文件（当前 212M）
2. **大文件被提交到 Git**：node_modules 或 .venv 可能被意外提交
3. **Git 历史包含大文件**：即使现在忽略了，历史中可能还有

## 解决方案

### 1. 检查当前 Git 状态

```bash
# 检查是否有大文件被跟踪
git ls-files | xargs ls -lh | sort -k5 -hr | head -20

# 检查 .git 目录大小
du -sh .git
```

### 2. 确保 .gitignore 正确

确保以下内容在 `.gitignore` 中：
```
node_modules/
.venv/
venv/
env/
*.db
*.sqlite
dist/
build/
```

### 3. 如果大文件已被提交

```bash
# 从 Git 中移除但保留本地文件
git rm -r --cached node_modules
git rm -r --cached .venv
git rm -r --cached frontend/dist

# 提交更改
git commit -m "Remove large files from git"
git push
```

### 4. 清理 Git 历史（如果必要）

如果大文件在历史中，需要清理：

```bash
# 使用 git-filter-repo（需要安装）
git filter-repo --path node_modules --invert-paths
git filter-repo --path .venv --invert-paths

# 或者使用 BFG Repo-Cleaner
# bfg --delete-folders node_modules
# bfg --delete-folders .venv
```

### 5. 优化 Railway 部署

1. **确保 .dockerignore 正确**：排除不需要的文件
2. **使用 Docker 多阶段构建**：减少构建上下文
3. **检查 Railway 日志**：查看具体的错误信息

## 快速修复

如果只是本地有大文件但 Git 是干净的：

1. 确保 `.gitignore` 包含所有需要忽略的目录
2. 提交并推送更改
3. Railway 应该只克隆 Git 仓库，不会包含被忽略的文件

## 检查清单

- [ ] `.gitignore` 包含 `node_modules/`
- [ ] `.gitignore` 包含 `.venv/`
- [ ] `.gitignore` 包含 `frontend/dist/`
- [ ] `.gitignore` 包含 `*.db`
- [ ] Git 仓库中没有大文件
- [ ] `.dockerignore` 正确配置
- [ ] Railway 项目连接到正确的 Git 仓库

