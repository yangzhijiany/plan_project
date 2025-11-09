from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

# 添加当前目录到路径，以便导入 models
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import Base, User, Task, Subtask, DailyTaskItem, DailyPlan

# 支持 Railway 的 PostgreSQL 或使用 SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./plans.db")

# 诊断：输出数据库类型（隐藏敏感信息）
if DATABASE_URL.startswith("sqlite"):
    print("⚠️  警告：正在使用 SQLite 数据库")
    print("⚠️  SQLite 数据存储在容器中，每次部署都会丢失数据！")
    print("⚠️  请确保在 Railway 上配置了 PostgreSQL 数据库服务")
    print(f"🔹 数据库路径: {DATABASE_URL}")
else:
    # 隐藏密码，只显示连接信息
    db_info = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL
    print(f"✅ 使用 PostgreSQL 数据库: {db_info}")

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
    from sqlalchemy import inspect
    
    # 检查是否需要创建表（优化：只在必要时输出日志）
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    required_tables = ['users', 'tasks', 'subtasks', 'daily_task_items']
    missing_tables = [t for t in required_tables if t not in existing_tables]
    
    if missing_tables:
        print(f"🔹 正在创建缺失的表: {', '.join(missing_tables)}...")
        Base.metadata.create_all(bind=engine)
        print("✅ 数据库表创建完成")
    else:
        # 表已存在，静默执行（确保结构是最新的）
        Base.metadata.create_all(bind=engine)
    
    # 运行迁移（添加新字段等）
    _run_migrations()

def _run_migrations():
    """运行数据库迁移"""
    from sqlalchemy import text, inspect
    
    try:
        inspector = inspect(engine)
        
        # 迁移 1: 为 subtasks 表添加 description 字段
        if 'subtasks' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('subtasks')]
            if 'description' not in columns:
                print("🔹 正在添加 description 字段到 subtasks 表...")
                try:
                    with engine.begin() as conn:
                        conn.execute(text("ALTER TABLE subtasks ADD COLUMN description TEXT"))
                    print("✅ description 字段已添加")
                except Exception as e:
                    error_str = str(e).lower()
                    if "duplicate column" in error_str or "already exists" in error_str:
                        print("✅ description 字段已存在")
                    else:
                        print(f"⚠️  添加 description 字段时出现警告: {str(e)}")
        
        # 迁移 2: 为 tasks 表添加 start_date 字段
        if 'tasks' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('tasks')]
            if 'start_date' not in columns:
                print("🔹 正在添加 start_date 字段到 tasks 表...")
                try:
                    with engine.begin() as conn:
                        conn.execute(text("ALTER TABLE tasks ADD COLUMN start_date DATE"))
                    print("✅ start_date 字段已添加")
                except Exception as e:
                    error_str = str(e).lower()
                    if "duplicate column" in error_str or "already exists" in error_str:
                        print("✅ start_date 字段已存在")
                    else:
                        print(f"⚠️  添加 start_date 字段时出现警告: {str(e)}")
    except Exception as e:
        # 迁移失败不应阻止应用启动
        print(f"⚠️  数据库迁移检查失败: {str(e)}")

# 获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
