#!/usr/bin/env python3
"""
Railway 启动脚本
用于在 Railway 平台上启动应用
"""
import os
import uvicorn
from database import init_db

# 初始化数据库
init_db()

# 获取端口，Railway 会自动设置 PORT 环境变量
port = int(os.getenv("PORT", 8000))

# 启动应用
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )

