"""
数据库迁移脚本：为 subtasks 表添加 description 字段
支持 SQLite 和 PostgreSQL
"""
import os
import sys

# 获取数据库 URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./plans.db")

# 判断数据库类型
if DATABASE_URL.startswith("sqlite"):
    # SQLite 迁移
    import sqlite3
    
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if db_path == "./plans.db":
        db_path = "./plans.db"
    
    if not os.path.exists(db_path):
        print(f"数据库文件 {db_path} 不存在，将在首次运行时自动创建")
        exit(0)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 检查 description 字段是否已存在
        cursor.execute("PRAGMA table_info(subtasks)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if "description" in column_names:
            print("✅ description 字段已存在，无需迁移")
        else:
            print("开始迁移：为 subtasks 表添加 description 字段")
            
            # SQLite 不支持直接添加列（某些版本支持），为了兼容性，使用 ALTER TABLE
            try:
                cursor.execute("ALTER TABLE subtasks ADD COLUMN description TEXT")
                conn.commit()
                print("✅ 迁移成功：description 字段已添加")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print("✅ description 字段已存在，无需迁移")
                else:
                    raise
        
        # 验证
        cursor.execute("PRAGMA table_info(subtasks)")
        columns = cursor.fetchall()
        print("\n当前 subtasks 表结构：")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
            
    except Exception as e:
        conn.rollback()
        print(f"❌ 迁移失败: {str(e)}")
        raise
    finally:
        conn.close()
        
elif DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    # PostgreSQL 迁移
    try:
        import psycopg2
        from urllib.parse import urlparse, parse_qs
    except ImportError:
        print("❌ 需要安装 psycopg2: pip install psycopg2-binary")
        sys.exit(1)
    
    # 解析数据库 URL
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    parsed = urlparse(DATABASE_URL)
    
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path[1:],  # 去掉 leading /
        user=parsed.username,
        password=parsed.password,
    )
    conn.autocommit = False
    cursor = conn.cursor()
    
    try:
        # 检查 description 字段是否已存在
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='subtasks' AND column_name='description'
        """)
        exists = cursor.fetchone()
        
        if exists:
            print("✅ description 字段已存在，无需迁移")
        else:
            print("开始迁移：为 subtasks 表添加 description 字段")
            cursor.execute("ALTER TABLE subtasks ADD COLUMN description TEXT")
            conn.commit()
            print("✅ 迁移成功：description 字段已添加")
        
        # 验证
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name='subtasks'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        print("\n当前 subtasks 表结构：")
        for col in columns:
            print(f"  {col[0]} ({col[1]}, nullable: {col[2]})")
            
    except Exception as e:
        conn.rollback()
        print(f"❌ 迁移失败: {str(e)}")
        raise
    finally:
        cursor.close()
        conn.close()
else:
    print(f"❌ 不支持的数据库类型: {DATABASE_URL}")
    sys.exit(1)

print("\n✅ 迁移完成！")

