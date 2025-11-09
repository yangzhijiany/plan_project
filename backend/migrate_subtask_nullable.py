"""
数据库迁移脚本：将 daily_task_items 表的 subtask_id 字段改为可为 NULL
"""
import sqlite3
import os

# 数据库文件路径
db_path = "./plans.db"

if not os.path.exists(db_path):
    print(f"数据库文件 {db_path} 不存在，无需迁移")
    exit(0)

# 连接数据库
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # 检查当前表结构
    cursor.execute("PRAGMA table_info(daily_task_items)")
    columns = cursor.fetchall()
    print("当前表结构：")
    for col in columns:
        print(f"  {col}")
    
    # 清理可能存在的临时表
    cursor.execute("DROP TABLE IF EXISTS daily_task_items_new")
    
    # 检查 subtask_id 是否已经可以为 NULL
    # PRAGMA table_info 返回: (cid, name, type, notnull, dflt_value, pk)
    # notnull: 1=NOT NULL, 0=可以为NULL
    subtask_col = [col for col in columns if col[1] == "subtask_id"]
    if subtask_col and subtask_col[0][3] == 1:  # 如果 notnull (3) 是 1，表示 NOT NULL，需要迁移
        print("\n开始迁移：将 subtask_id 改为可为 NULL")
        
        # SQLite 不支持直接修改列约束，需要重建表
        # 1. 创建新表（subtask_id 可为 NULL）
        cursor.execute("""
            CREATE TABLE daily_task_items_new (
                id INTEGER NOT NULL PRIMARY KEY,
                date DATE NOT NULL,
                task_id INTEGER NOT NULL,
                subtask_id INTEGER,
                allocated_hours FLOAT NOT NULL,
                is_completed BOOLEAN NOT NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY(task_id) REFERENCES tasks (id),
                FOREIGN KEY(subtask_id) REFERENCES subtasks (id)
            )
        """)
        
        # 2. 复制数据（复制所有数据）
        cursor.execute("""
            INSERT INTO daily_task_items_new 
            (id, date, task_id, subtask_id, allocated_hours, is_completed, created_at)
            SELECT id, date, task_id, subtask_id, allocated_hours, is_completed, created_at
            FROM daily_task_items
        """)
        
        # 3. 删除旧表（索引也会被删除）
        cursor.execute("DROP TABLE daily_task_items")
        
        # 4. 重命名新表
        cursor.execute("ALTER TABLE daily_task_items_new RENAME TO daily_task_items")
        
        # 5. 重新创建索引
        cursor.execute("CREATE INDEX ix_daily_task_items_date ON daily_task_items (date)")
        cursor.execute("CREATE INDEX ix_daily_task_items_task_id ON daily_task_items (task_id)")
        cursor.execute("CREATE INDEX ix_daily_task_items_subtask_id ON daily_task_items (subtask_id)")
        
        # 提交更改
        conn.commit()
        print("✅ 迁移成功：subtask_id 现在可以为 NULL")
        
        # 验证新表结构
        cursor.execute("PRAGMA table_info(daily_task_items)")
        columns = cursor.fetchall()
        print("\n新表结构：")
        for col in columns:
            print(f"  {col}")
    else:
        print("✅ subtask_id 已经可以为 NULL，无需迁移")
        
except Exception as e:
    conn.rollback()
    print(f"❌ 迁移失败: {str(e)}")
    raise
finally:
    conn.close()

