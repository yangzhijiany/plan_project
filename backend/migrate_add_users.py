"""
数据库迁移脚本：添加用户表，并为现有任务添加默认用户
"""
import sqlite3
import os
import uuid

# 数据库文件路径
db_path = "./plans.db"

if not os.path.exists(db_path):
    print(f"数据库文件 {db_path} 不存在，将在首次运行时创建")
    exit(0)

# 连接数据库
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # 检查 users 表是否已存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    users_table_exists = cursor.fetchone() is not None
    
    if not users_table_exists:
        print("创建 users 表...")
        # 创建 users 表
        cursor.execute("""
            CREATE TABLE users (
                id INTEGER NOT NULL PRIMARY KEY,
                user_id VARCHAR NOT NULL UNIQUE,
                nickname VARCHAR NOT NULL,
                created_at DATETIME NOT NULL
            )
        """)
        cursor.execute("CREATE INDEX ix_users_user_id ON users (user_id)")
        cursor.execute("CREATE INDEX ix_users_nickname ON users (nickname)")
        
        # 创建默认用户（用于迁移现有数据）
        default_user_id = str(uuid.uuid4())[:8]
        cursor.execute("""
            INSERT INTO users (user_id, nickname, created_at)
            VALUES (?, ?, datetime('now'))
        """, (default_user_id, "默认用户"))
        
        print(f"✅ 创建默认用户: user_id={default_user_id}, nickname=默认用户")
    else:
        print("✅ users 表已存在")
    
    # 检查 tasks 表是否有 user_id 字段
    cursor.execute("PRAGMA table_info(tasks)")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    if 'user_id' not in column_names:
        print("为 tasks 表添加 user_id 字段...")
        
        # 获取默认用户ID
        cursor.execute("SELECT id, user_id FROM users LIMIT 1")
        default_user = cursor.fetchone()
        
        if not default_user:
            # 如果没有用户，创建一个默认用户
            default_user_id = str(uuid.uuid4())[:8]
            cursor.execute("""
                INSERT INTO users (user_id, nickname, created_at)
                VALUES (?, ?, datetime('now'))
            """, (default_user_id, "默认用户"))
            cursor.execute("SELECT id, user_id FROM users WHERE user_id = ?", (default_user_id,))
            default_user = cursor.fetchone()
        
        default_user_db_id = default_user[0]
        
        # SQLite 不支持直接添加 NOT NULL 列，需要重建表
        # 1. 创建新表
        cursor.execute("""
            CREATE TABLE tasks_new (
                id INTEGER NOT NULL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                task_name VARCHAR NOT NULL,
                description TEXT NOT NULL,
                importance VARCHAR NOT NULL,
                is_long_term BOOLEAN NOT NULL,
                deadline DATE,
                created_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users (id)
            )
        """)
        
        # 2. 复制数据（为所有现有任务分配默认用户）
        cursor.execute("""
            INSERT INTO tasks_new 
            (id, user_id, task_name, description, importance, is_long_term, deadline, created_at)
            SELECT id, ?, task_name, description, importance, is_long_term, deadline, created_at
            FROM tasks
        """, (default_user_db_id,))
        
        # 3. 删除旧表（索引也会被删除）
        cursor.execute("DROP TABLE tasks")
        
        # 4. 重命名新表
        cursor.execute("ALTER TABLE tasks_new RENAME TO tasks")
        
        # 5. 重新创建索引
        cursor.execute("CREATE INDEX ix_tasks_user_id ON tasks (user_id)")
        cursor.execute("CREATE INDEX ix_tasks_task_name ON tasks (task_name)")
        cursor.execute("CREATE INDEX ix_tasks_deadline ON tasks (deadline)")
        
        print(f"✅ 为所有现有任务分配了默认用户 (user_id={default_user[1]})")
    else:
        print("✅ tasks 表已有 user_id 字段")
    
    # 提交更改
    conn.commit()
    print("✅ 迁移完成")
    
except Exception as e:
    conn.rollback()
    print(f"❌ 迁移失败: {str(e)}")
    raise
finally:
    conn.close()

