from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

# 添加当前目录到路径，以便导入 models
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import Base, User, Task, Subtask, DailyTaskItem, DailyPlan

# 支持 Railway 的 PostgreSQL 或使用 SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./plans.db")

# 如果使用 PostgreSQL (Railway)，需要转换 URL 格式
# Railway 提供的 PostgreSQL URL 格式是 postgres://，但 SQLAlchemy 需要 postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 如果是 SQLite，使用 check_same_thread=False
# 如果是 PostgreSQL，不需要这个参数
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建数据库表
def init_db():
    Base.metadata.create_all(bind=engine)

# 获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
