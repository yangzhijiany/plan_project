# 如何设置 OpenAI API Key

## 步骤 1: 创建 .env 文件

在 `backend` 目录下创建 `.env` 文件：

```bash
cd backend
```

## 步骤 2: 添加 API Key

在 `.env` 文件中添加以下内容：

```
OPENAI_API_KEY=sk-your-api-key-here
```

**重要提示**：
- 将 `sk-your-api-key-here` 替换为你的实际 OpenAI API Key
- API Key 通常以 `sk-` 开头
- 不要包含引号或空格

## 步骤 3: 获取 OpenAI API Key

如果你还没有 API Key：

1. 访问 https://platform.openai.com/api-keys
2. 登录你的 OpenAI 账户
3. 点击 "Create new secret key"
4. 复制生成的 API Key
5. 将 API Key 粘贴到 `.env` 文件中

## 完整示例

`.env` 文件内容应该类似这样：

```
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

## 验证设置

启动后端服务器后，如果 API Key 设置正确，生成计划功能将正常工作。

如果 API Key 未设置或无效，调用 `/generate_plan` 接口时会返回错误信息。

## 安全提示

⚠️ **重要**：
- `.env` 文件已添加到 `.gitignore`，不会被提交到 Git
- 不要将 API Key 分享给他人
- 不要在代码中硬编码 API Key
- 如果 API Key 泄露，立即在 OpenAI 平台撤销并重新生成

## 文件位置

```
plan_project/
└── backend/
    ├── .env          ← 在这里创建这个文件
    ├── main.py
    ├── database.py
    └── ...
```

