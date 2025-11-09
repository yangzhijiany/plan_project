from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from datetime import date, datetime, timedelta
from typing import List, Optional
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from database import init_db, get_db
from models import User, Task, Subtask, DailyTaskItem
import uuid

# 加载环境变量
load_dotenv()

# 初始化 FastAPI 应用
app = FastAPI(title="LLM Task Planner API")

# 获取前端构建目录路径
# 支持多种路径：开发环境和生产环境（Railway）
# Railway 的工作目录是 /app
current_dir = Path(__file__).parent.parent.resolve()
FRONTEND_DIR = current_dir / "frontend" / "dist"

# 如果相对路径不存在，尝试绝对路径（Railway 环境）
if not FRONTEND_DIR.exists():
    FRONTEND_DIR = Path("/app/frontend/dist")
    
# 如果还是不存在，尝试当前工作目录
if not FRONTEND_DIR.exists():
    FRONTEND_DIR = Path.cwd() / "frontend" / "dist"

# 确保目录存在（即使为空）
FRONTEND_DIR.mkdir(parents=True, exist_ok=True)

# 配置 CORS
# 从环境变量获取允许的来源，如果没有则使用默认值
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化数据库
init_db()

# 挂载静态文件（前端构建产物）
# 检查前端构建目录是否存在且有文件
def check_frontend_built():
    """检查前端是否已构建"""
    if not FRONTEND_DIR.exists():
        return False, f"Directory does not exist: {FRONTEND_DIR}"
    
    try:
        files = list(FRONTEND_DIR.iterdir())
        if not files:
            return False, f"Directory is empty: {FRONTEND_DIR}"
        
        # 检查是否有 index.html
        index_file = FRONTEND_DIR / "index.html"
        if not index_file.exists():
            return False, f"index.html not found in: {FRONTEND_DIR}"
        
        return True, f"Frontend built successfully: {len(files)} files"
    except Exception as e:
        return False, f"Error checking directory: {str(e)}"

frontend_built, frontend_status = check_frontend_built()

if frontend_built:
    try:
        # 挂载静态资源目录（CSS、JS、图片等）
        assets_dir = FRONTEND_DIR / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
        print(f"✅ {frontend_status}")
        print(f"   Frontend directory: {FRONTEND_DIR}")
    except Exception as e:
        print(f"⚠️  Warning: Could not mount static files: {e}")
else:
    print(f"⚠️  {frontend_status}")
    print(f"   Frontend directory: {FRONTEND_DIR}")
    # 列出目录内容以便调试
    if FRONTEND_DIR.exists():
        try:
            files = list(FRONTEND_DIR.iterdir())
            print(f"   Files in directory: {[f.name for f in files]}")
        except Exception as e:
            print(f"   Error listing files: {e}")

# 初始化 OpenAI 客户端（延迟初始化，避免启动时就需要 API key）
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500, 
            detail="OPENAI_API_KEY 未设置。请在生产环境的环境变量中配置 OPENAI_API_KEY"
        )
    return OpenAI(api_key=api_key)


# Pydantic 模型
class UserCreate(BaseModel):
    nickname: str


class UserResponse(BaseModel):
    id: int
    user_id: str
    nickname: str
    created_at: str


class TaskCreate(BaseModel):
    task_name: str
    description: str  # 自然语言描述
    importance: str = "medium"  # low, medium, high
    is_long_term: bool = False
    deadline: Optional[str] = None  # YYYY-MM-DD 格式，长期任务为 None
    user_id: str  # 用户ID


class SubtaskResponse(BaseModel):
    id: int
    subtask_name: str
    estimated_hours: float
    is_completed: bool


class TaskResponse(BaseModel):
    id: int
    task_name: str
    description: str
    importance: str
    is_long_term: bool
    deadline: Optional[str]
    subtasks: List[SubtaskResponse]
    created_at: str


class DailyItemResponse(BaseModel):
    id: int
    date: str
    task_id: int
    task_name: str
    subtask_id: int
    subtask_name: str
    allocated_hours: float
    is_completed: bool
    importance: str


class GenerateSubtasksRequest(BaseModel):
    description: str
    deadline: Optional[str] = None
    is_long_term: bool = False


class SubtaskUpdate(BaseModel):
    estimated_hours: float = 0.0
    
    class Config:
        json_schema_extra = {
            "example": {
                "estimated_hours": 2.5
            }
        }
        
        @validator('estimated_hours')
        def validate_hours(cls, v):
            if v < 0:
                raise ValueError('预计时间不能为负数')
            return v


class AllocatedHoursUpdate(BaseModel):
    allocated_hours: float


@app.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """创建新用户"""
    try:
        # 检查昵称是否已存在
        existing_user = db.query(User).filter(User.nickname == user.nickname).first()
        if existing_user:
            # 如果用户已存在，返回现有用户
            return UserResponse(
                id=existing_user.id,
                user_id=existing_user.user_id,
                nickname=existing_user.nickname,
                created_at=existing_user.created_at.isoformat()
            )
        
        # 生成唯一用户ID
        user_id = str(uuid.uuid4())[:8]  # 使用UUID的前8位作为用户ID
        
        db_user = User(
            user_id=user_id,
            nickname=user.nickname
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return UserResponse(
            id=db_user.id,
            user_id=db_user.user_id,
            nickname=db_user.nickname,
            created_at=db_user.created_at.isoformat()
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"创建用户失败: {str(e)}")


@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """根据用户ID获取用户信息"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户未找到")
    
    return UserResponse(
        id=user.id,
        user_id=user.user_id,
        nickname=user.nickname,
        created_at=user.created_at.isoformat()
    )


@app.get("/users/by-nickname/{nickname}", response_model=UserResponse)
async def get_user_by_nickname(nickname: str, db: Session = Depends(get_db)):
    """根据昵称获取用户信息"""
    user = db.query(User).filter(User.nickname == nickname).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户未找到")
    
    return UserResponse(
        id=user.id,
        user_id=user.user_id,
        nickname=user.nickname,
        created_at=user.created_at.isoformat()
    )


@app.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """创建新任务"""
    try:
        # 根据 user_id 查找用户
        user = db.query(User).filter(User.user_id == task.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户未找到")
        
        deadline_date = None
        if task.deadline and not task.is_long_term:
            deadline_date = datetime.strptime(task.deadline, "%Y-%m-%d").date()
            if deadline_date < date.today():
                raise HTTPException(status_code=400, detail="截止日期不能早于今天")
        
        db_task = Task(
            user_id=user.id,
            task_name=task.task_name,
            description=task.description,
            importance=task.importance,
            is_long_term=task.is_long_term,
            deadline=deadline_date
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)
        
        return TaskResponse(
            id=db_task.id,
            task_name=db_task.task_name,
            description=db_task.description,
            importance=db_task.importance,
            is_long_term=db_task.is_long_term,
            deadline=db_task.deadline.isoformat() if db_task.deadline else None,
            subtasks=[],
            created_at=db_task.created_at.isoformat()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"日期格式错误: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建任务失败: {str(e)}")


@app.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(user_id: str = None, db: Session = Depends(get_db)):
    """获取所有任务（可筛选用户）"""
    query = db.query(Task)
    
    if user_id:
        # 根据 user_id 查找用户
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户未找到")
        query = query.filter(Task.user_id == user.id)
    
    tasks = query.order_by(Task.created_at.desc()).all()
    result = []
    for task in tasks:
        subtasks = [
            SubtaskResponse(
                id=st.id,
                subtask_name=st.subtask_name,
                estimated_hours=st.estimated_hours,
                is_completed=st.is_completed
            )
            for st in task.subtasks
        ]
        result.append(TaskResponse(
            id=task.id,
            task_name=task.task_name,
            description=task.description,
            importance=task.importance,
            is_long_term=task.is_long_term,
            deadline=task.deadline.isoformat() if task.deadline else None,
            subtasks=subtasks,
            created_at=task.created_at.isoformat()
        ))
    return result


@app.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int, user_id: str = None, db: Session = Depends(get_db)):
    """获取任务详情"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务未找到")
    
    # 如果提供了 user_id，验证任务是否属于该用户
    if user_id:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user or task.user_id != user.id:
            raise HTTPException(status_code=403, detail="无权访问此任务")
    
    subtasks = [
        SubtaskResponse(
            id=st.id,
            subtask_name=st.subtask_name,
            estimated_hours=st.estimated_hours,
            is_completed=st.is_completed
        )
        for st in task.subtasks
    ]
    
    return TaskResponse(
        id=task.id,
        task_name=task.task_name,
        description=task.description,
        importance=task.importance,
        is_long_term=task.is_long_term,
        deadline=task.deadline.isoformat() if task.deadline else None,
        subtasks=subtasks,
        created_at=task.created_at.isoformat()
    )


@app.post("/tasks/{task_id}/generate-subtasks")
async def generate_subtasks(task_id: int, request: GenerateSubtasksRequest, db: Session = Depends(get_db)):
    """根据任务描述生成子任务"""
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="任务未找到")
        
        # 构建提示词
        today = date.today()
        deadline_str = request.deadline if request.deadline else "无截止日期（长期任务）"
        
        prompt = f"""作为一个专业的学习和工作计划助手，请根据以下任务描述，生成详细的子任务列表。

任务名称: {task.task_name}
任务描述: {request.description}
截止日期: {deadline_str}
是否为长期任务: {'是' if request.is_long_term else '否'}

要求:
1. 仔细分析任务描述，识别所有需要完成的子任务
2. 将任务描述拆分成具体的、可执行的子任务
3. 为每个子任务估算完成所需的时间（单位：小时），要合理估算
4. 子任务应该具体、明确，便于执行
5. 如果任务较大，可以拆分成多个子任务
6. 返回 JSON 格式，格式如下:
{{
  "subtasks": [
    {{"name": "子任务1", "estimated_hours": 2.0}},
    {{"name": "子任务2", "estimated_hours": 3.5}},
    {{"name": "子任务3", "estimated_hours": 1.0}}
  ]
}}

只返回 JSON 对象，不要其他解释文字。确保 estimated_hours 是数字类型。"""

        # 调用 OpenAI API
        openai_client = get_openai_client()
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "你是一个专业的学习和工作计划助手。总是返回有效的 JSON 格式数据。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI API 调用失败: {str(e)}")
        
        # 解析响应
        content = response.choices[0].message.content.strip()
        # 移除可能的 markdown 代码块标记
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        result = json.loads(content)
        
        # 创建子任务
        created_subtasks = []
        for subtask_data in result.get("subtasks", []):
            db_subtask = Subtask(
                task_id=task_id,
                subtask_name=subtask_data["name"],
                estimated_hours=float(subtask_data.get("estimated_hours", 0.0))
            )
            db.add(db_subtask)
            db.commit()
            db.refresh(db_subtask)
            created_subtasks.append(SubtaskResponse(
                id=db_subtask.id,
                subtask_name=db_subtask.subtask_name,
                estimated_hours=db_subtask.estimated_hours,
                is_completed=db_subtask.is_completed
            ))
        
        return {"subtasks": created_subtasks}
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"解析 LLM 响应失败: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成子任务失败: {str(e)}")


@app.post("/tasks/{task_id}/generate-plan")
async def generate_plan(task_id: int, user_id: str = None, db: Session = Depends(get_db)):
    """为任务生成每日计划"""
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="任务未找到")
        
        # 如果提供了 user_id，验证任务是否属于该用户
        if user_id:
            user = db.query(User).filter(User.user_id == user_id).first()
            if not user or task.user_id != user.id:
                raise HTTPException(status_code=403, detail="无权访问此任务")
        
        # 长期任务不需要子任务，直接生成计划
        if task.is_long_term:
            # 为长期任务生成未来30天的计划
            start_date = date.today()
            end_date = start_date + timedelta(days=30)
            
            # 创建每日计划项（长期任务每天分配固定时间）
            created_items = []
            current_date = start_date
            daily_hours = 1.5  # 长期任务每天1.5小时
            
            while current_date <= end_date:
                # 检查是否已存在该日期的计划项
                existing = db.query(DailyTaskItem).filter(
                    DailyTaskItem.date == current_date,
                    DailyTaskItem.task_id == task_id
                ).first()
                
                if not existing:
                    # 创建计划项（长期任务不需要子任务，subtask_id 为 NULL）
                    db_item = DailyTaskItem(
                        date=current_date,
                        task_id=task_id,
                        subtask_id=None,  # 长期任务没有子任务，设为 NULL
                        allocated_hours=daily_hours
                    )
                    db.add(db_item)
                    created_items.append({
                        "date": current_date.isoformat(),
                        "task_name": task.task_name,
                        "allocated_hours": daily_hours
                    })
                
                current_date += timedelta(days=1)
            
            db.commit()
            return {"message": "长期任务计划生成成功", "items": created_items}
        
        # 非长期任务需要子任务
        if not task.subtasks:
            raise HTTPException(status_code=400, detail="任务还没有子任务，请先生成子任务")
        
        # 非长期任务，需要设置截止日期
        if not task.deadline:
            raise HTTPException(status_code=400, detail="非长期任务必须设置截止日期")
        
        start_date = date.today()
        end_date = task.deadline
        days = (end_date - start_date).days + 1
        if days <= 0:
            raise HTTPException(status_code=400, detail="截止日期不能早于今天")
        
        # 构建提示词
        subtasks_info = [
            f"{st.subtask_name} (预计 {st.estimated_hours} 小时)"
            for st in task.subtasks
        ]
        
        prompt = f"""作为一个专业的学习和工作计划助手，请为以下任务生成一个详细的每日计划。

任务名称: {task.task_name}
任务描述: {task.description}
任务重要性: {task.importance}
是否为长期任务: {'是' if task.is_long_term else '否'}
{'截止日期: ' + task.deadline.isoformat() if task.deadline else ''}

子任务列表（按顺序编号）:
{chr(10).join([f"{i+1}. {info}" for i, info in enumerate(subtasks_info)])}

要求:
1. 从今天 ({start_date}) 开始，到 {'未来30天' if task.is_long_term else task.deadline.isoformat()} 为止，生成每日计划
2. **重要：每天可以分配多个子任务**，比如同一天可以复习PPT和MP，或者复习PPT和WA
3. 合理分配每个子任务到不同的日期，确保在截止日期前完成所有子任务
4. 如果任务较多或时间较长，可以将一个子任务拆分到多天完成
5. 确保每天的工作量均衡（建议每天2-4小时），根据重要性调整任务分配
6. 长期任务应该每天分配少量时间（1-2小时），保持持续性
7. 分配的 hours 应该合理，不要超过子任务的 estimated_hours
8. 尽量让每天的多个子任务搭配合理，比如相关的任务可以放在同一天
9. 返回 JSON 格式，格式如下:
{{
  "plan": [
    {{"date": "YYYY-MM-DD", "subtask_id": 1, "allocated_hours": 2.0, "subtask_name": "子任务1"}},
    {{"date": "YYYY-MM-DD", "subtask_id": 2, "allocated_hours": 1.5, "subtask_name": "子任务2"}},
    {{"date": "YYYY-MM-DD", "subtask_id": 1, "allocated_hours": 1.0, "subtask_name": "子任务1"}},
    {{"date": "YYYY-MM-DD", "subtask_id": 3, "allocated_hours": 1.5, "subtask_name": "子任务3"}}
  ]
}}

注意：
- **每天可以有多个子任务**，比如同一天可以有 subtask_id 1 和 subtask_id 2
- subtask_id 对应子任务的顺序编号（从1开始）
- subtask_name 是子任务的名称（用于验证）
- allocated_hours 是分配的时间（小时），每天的总时间建议在2-4小时
- 日期格式必须是 YYYY-MM-DD
- 确保所有子任务都被分配到计划中

只返回 JSON 对象，不要其他解释文字。"""

        # 调用 OpenAI API
        openai_client = get_openai_client()
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "你是一个专业的学习和工作计划助手。总是返回有效的 JSON 格式数据。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI API 调用失败: {str(e)}")
        
        # 解析响应
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        result = json.loads(content)
        
        # 创建每日计划
        # 刷新任务以获取最新的子任务列表
        db.refresh(task)
        subtasks_list = list(task.subtasks)
        created_items = []
        
        for item in result.get("plan", []):
            try:
                plan_date = datetime.strptime(item["date"], "%Y-%m-%d").date()
                subtask_index = item.get("subtask_id", 1) - 1  # 转换为索引（从1开始）
                
                if subtask_index < 0 or subtask_index >= len(subtasks_list):
                    # 如果索引无效，尝试按名称匹配
                    subtask_name = item.get("subtask_name", "")
                    subtask = next((st for st in subtasks_list if st.subtask_name == subtask_name), None)
                    if not subtask:
                        continue  # 跳过无效的子任务
                else:
                    subtask = subtasks_list[subtask_index]
                
                allocated_hours = float(item.get("allocated_hours", 0.0))
                
                # 检查是否已存在相同的计划项
                existing = db.query(DailyTaskItem).filter(
                    DailyTaskItem.date == plan_date,
                    DailyTaskItem.task_id == task_id,
                    DailyTaskItem.subtask_id == subtask.id
                ).first()
                
                if existing:
                    existing.allocated_hours = allocated_hours
                else:
                    db_item = DailyTaskItem(
                        date=plan_date,
                        task_id=task_id,
                        subtask_id=subtask.id,
                        allocated_hours=allocated_hours
                    )
                    db.add(db_item)
                
                created_items.append({
                    "date": plan_date.isoformat(),
                    "subtask_name": subtask.subtask_name,
                    "allocated_hours": allocated_hours
                })
            except (ValueError, KeyError) as e:
                continue  # 跳过无效的数据项
        
        db.commit()
        
        return {"message": "计划生成成功", "items": created_items}
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"解析 LLM 响应失败: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成计划失败: {str(e)}")


@app.put("/subtasks/{subtask_id}")
async def update_subtask(subtask_id: int, update: SubtaskUpdate, db: Session = Depends(get_db)):
    """更新子任务的预计时间"""
    try:
        subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
        if not subtask:
            raise HTTPException(status_code=404, detail="子任务未找到")
        
        if update.estimated_hours < 0:
            raise HTTPException(status_code=400, detail="预计时间不能为负数")
        
        subtask.estimated_hours = update.estimated_hours
        db.commit()
        db.refresh(subtask)
        
        return SubtaskResponse(
            id=subtask.id,
            subtask_name=subtask.subtask_name,
            estimated_hours=subtask.estimated_hours,
            is_completed=subtask.is_completed
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"更新子任务失败: {str(e)}")


@app.get("/calendar")
async def get_calendar(user_id: str = None, start_date: Optional[str] = None, end_date: Optional[str] = None, db: Session = Depends(get_db)):
    """获取日历视图数据"""
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="必须提供 user_id 参数")
        
        # 根据 user_id 查找用户
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户未找到")
        
        if start_date:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
        else:
            start = date.today()
        
        if end_date:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        else:
            end = start + timedelta(days=60)  # 默认显示未来60天
        
        # 只查询该用户的任务
        items = db.query(DailyTaskItem).join(Task).filter(
            Task.user_id == user.id,
            DailyTaskItem.date >= start,
            DailyTaskItem.date <= end
        ).order_by(DailyTaskItem.date).all()
        
        result = []
        for item in items:
            task = db.query(Task).filter(Task.id == item.task_id).first()
            
            if not task:
                continue
            
            # 长期任务可能没有子任务（subtask_id 为 NULL）
            if item.subtask_id is None:
                # 长期任务，显示任务名称
                result.append(DailyItemResponse(
                    id=item.id,
                    date=item.date.isoformat(),
                    task_id=item.task_id,
                    task_name=task.task_name,
                    subtask_id=0,  # 前端使用 0 表示长期任务
                    subtask_name=task.task_name,  # 长期任务显示任务名称
                    allocated_hours=item.allocated_hours,
                    is_completed=item.is_completed,
                    importance=task.importance
                ))
            else:
                # 普通任务，需要子任务
                subtask = db.query(Subtask).filter(Subtask.id == item.subtask_id).first()
                if subtask:
                    result.append(DailyItemResponse(
                        id=item.id,
                        date=item.date.isoformat(),
                        task_id=item.task_id,
                        task_name=task.task_name,
                        subtask_id=item.subtask_id,
                        subtask_name=subtask.subtask_name,
                        allocated_hours=item.allocated_hours,
                        is_completed=item.is_completed,
                        importance=task.importance
                    ))
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"日期格式错误: {str(e)}")


@app.put("/daily-items/{item_id}")
async def update_daily_item(item_id: int, update: AllocatedHoursUpdate, db: Session = Depends(get_db)):
    """更新每日任务项的分配时间"""
    item = db.query(DailyTaskItem).filter(DailyTaskItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="任务项未找到")
    
    item.allocated_hours = update.allocated_hours
    db.commit()
    db.refresh(item)
    
    task = db.query(Task).filter(Task.id == item.task_id).first()
    
    # 长期任务可能没有子任务（subtask_id 为 NULL）
    if item.subtask_id is None:
        # 长期任务
        subtask_name = task.task_name if task else ""
    else:
        # 普通任务
        subtask = db.query(Subtask).filter(Subtask.id == item.subtask_id).first()
        subtask_name = subtask.subtask_name if subtask else ""
    
    return DailyItemResponse(
        id=item.id,
        date=item.date.isoformat(),
        task_id=item.task_id,
        task_name=task.task_name if task else "",
        subtask_id=item.subtask_id if item.subtask_id is not None else 0,
        subtask_name=subtask_name,
        allocated_hours=item.allocated_hours,
        is_completed=item.is_completed,
        importance=task.importance if task else "medium"
    )


@app.delete("/daily-items/{item_id}")
async def delete_daily_item(
    item_id: int, 
    user_id: str = None, 
    delete_future: bool = False,
    db: Session = Depends(get_db)
):
    """删除日历中的特定任务项
    
    Args:
        item_id: 任务项ID
        user_id: 用户ID（可选）
        delete_future: 如果为True，删除该任务的所有未来日期项（从该任务项的日期开始）
    """
    item = db.query(DailyTaskItem).filter(DailyTaskItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="任务项未找到")
    
    # 如果提供了 user_id，验证任务是否属于该用户
    if user_id:
        user = db.query(User).filter(User.user_id == user_id).first()
        task = db.query(Task).filter(Task.id == item.task_id).first()
        if not user or not task or task.user_id != user.id:
            raise HTTPException(status_code=403, detail="无权访问此任务")
    
    deleted_count = 0
    
    if delete_future:
        # 获取任务信息
        task = db.query(Task).filter(Task.id == item.task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="任务未找到")
        
        # 删除该任务的所有未来日期项（从当前任务项的日期开始，包括当前项）
        # 如果是长期任务（subtask_id 为 None），删除所有未来的长期任务项
        # 如果是普通任务，删除该任务的所有未来项（所有子任务）
        if item.subtask_id is None:
            # 长期任务：删除所有未来日期的长期任务项（subtask_id 为 None）
            future_items = db.query(DailyTaskItem).filter(
                DailyTaskItem.task_id == item.task_id,
                DailyTaskItem.date >= item.date,
                DailyTaskItem.subtask_id.is_(None)  # 只删除长期任务项
            ).all()
        else:
            # 普通任务：删除该任务的所有未来项（包括所有子任务）
            # 用户要求删除"同名任务"，所以删除该任务的所有未来项
            future_items = db.query(DailyTaskItem).filter(
                DailyTaskItem.task_id == item.task_id,
                DailyTaskItem.date >= item.date
            ).all()
        
        deleted_count = len(future_items)
        for future_item in future_items:
            db.delete(future_item)
    else:
        # 只删除当前任务项
        db.delete(item)
        deleted_count = 1
    
    db.commit()
    
    if delete_future:
        return {"message": f"已删除 {deleted_count} 个未来任务项"}
    else:
        return {"message": "任务项已删除"}


@app.delete("/tasks/{task_id}")
async def delete_task(task_id: int, user_id: str = None, db: Session = Depends(get_db)):
    """删除任务（会级联删除所有子任务和计划项）"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务未找到")
    
    # 如果提供了 user_id，验证任务是否属于该用户
    if user_id:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user or task.user_id != user.id:
            raise HTTPException(status_code=403, detail="无权访问此任务")
    
    db.delete(task)
    db.commit()
    return {"message": "任务已删除"}


@app.delete("/calendar/clear")
async def clear_calendar(user_id: str = None, db: Session = Depends(get_db)):
    """清空指定用户的日历计划项"""
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="必须提供 user_id 参数")
        
        # 根据 user_id 查找用户
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户未找到")
        
        # 先获取该用户的所有任务ID
        user_tasks = db.query(Task.id).filter(Task.user_id == user.id).all()
        task_ids = [task.id for task in user_tasks]
        
        if not task_ids:
            return {"message": "没有需要清空的计划项"}
        
        # 删除所有属于这些任务的任务项
        deleted_count = db.query(DailyTaskItem).filter(
            DailyTaskItem.task_id.in_(task_ids)
        ).delete(synchronize_session=False)
        
        db.commit()
        return {"message": f"已清空 {deleted_count} 个计划项"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"清空日历失败: {str(e)}")


@app.get("/today")
async def get_today_plans(user_id: str = None, db: Session = Depends(get_db)):
    """获取今日计划"""
    if not user_id:
        raise HTTPException(status_code=400, detail="必须提供 user_id 参数")
    
    # 根据 user_id 查找用户
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户未找到")
    
    today = date.today()
    # 只查询该用户的任务
    items = db.query(DailyTaskItem).join(Task).filter(
        Task.user_id == user.id,
        DailyTaskItem.date == today
    ).order_by(DailyTaskItem.created_at).all()
    
    result = []
    for item in items:
        task = db.query(Task).filter(Task.id == item.task_id).first()
        
        if not task:
            continue
        
        # 长期任务可能没有子任务（subtask_id 为 NULL）
        if item.subtask_id is None:
            # 长期任务，显示任务名称
            result.append(DailyItemResponse(
                id=item.id,
                date=item.date.isoformat(),
                task_id=item.task_id,
                task_name=task.task_name,
                subtask_id=0,  # 前端使用 0 表示长期任务
                subtask_name=task.task_name,  # 长期任务显示任务名称
                allocated_hours=item.allocated_hours,
                is_completed=item.is_completed,
                importance=task.importance
            ))
        else:
            # 普通任务，需要子任务
            subtask = db.query(Subtask).filter(Subtask.id == item.subtask_id).first()
            if subtask:
                result.append(DailyItemResponse(
                    id=item.id,
                    date=item.date.isoformat(),
                    task_id=item.task_id,
                    task_name=task.task_name,
                    subtask_id=item.subtask_id,
                    subtask_name=subtask.subtask_name,
                    allocated_hours=item.allocated_hours,
                    is_completed=item.is_completed,
                    importance=task.importance
                ))
    
    return result


# ============================================================================
# 前端静态文件服务（必须在所有 API 路由之后定义）
# ============================================================================

# 定义 API 路径列表，这些路径不应该被前端路由处理
API_PATHS = [
    "tasks", "calendar", "today", "daily-items", "subtasks", 
    "users", "user", "docs", "openapi.json", "redoc", "api"
]

@app.get("/")
async def serve_index():
    """提供前端首页"""
    if frontend_built:
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
    
    # 如果前端未构建，返回 API 信息
    return {
        "message": "LLM Task Planner API",
        "frontend_built": frontend_built,
        "frontend_dir": str(FRONTEND_DIR),
        "docs": "/docs"
    }


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """处理前端路由和静态文件"""
    # 检查是否是 API 路径
    if any(full_path.startswith(path) for path in API_PATHS):
        raise HTTPException(status_code=404, detail="Not found")
    
    # 如果前端未构建，返回错误
    if not frontend_built:
        raise HTTPException(
            status_code=404, 
            detail=f"Frontend not built. Path: {full_path}. Frontend directory: {FRONTEND_DIR}"
        )
    
    # 检查是否是静态文件（CSS、JS、图片等）
    requested_file = FRONTEND_DIR / full_path
    
    # 安全检查：确保请求的文件在 frontend/dist 目录内
    try:
        if requested_file.exists() and requested_file.is_file():
            # 验证路径安全性
            requested_file.resolve().relative_to(FRONTEND_DIR.resolve())
            return FileResponse(str(requested_file))
    except (ValueError, OSError):
        # 路径不在允许的目录内，继续处理
        pass
    
    # 对于 React Router 路由（如 /create, /calendar 等），返回 index.html
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    
    raise HTTPException(status_code=404, detail="Not found")




@app.put("/daily-items/{item_id}/toggle-complete")
async def toggle_item_complete(item_id: int, user_id: str = None, db: Session = Depends(get_db)):
    """切换任务项的完成状态"""
    item = db.query(DailyTaskItem).filter(DailyTaskItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="任务项未找到")
    
    # 如果提供了 user_id，验证任务是否属于该用户
    if user_id:
        user = db.query(User).filter(User.user_id == user_id).first()
        task = db.query(Task).filter(Task.id == item.task_id).first()
        if not user or not task or task.user_id != user.id:
            raise HTTPException(status_code=403, detail="无权访问此任务")
    
    item.is_completed = not item.is_completed
    db.commit()
    db.refresh(item)
    
    task = db.query(Task).filter(Task.id == item.task_id).first()
    
    # 长期任务可能没有子任务（subtask_id 为 NULL）
    if item.subtask_id is None:
        # 长期任务
        subtask_name = task.task_name if task else ""
    else:
        # 普通任务
        subtask = db.query(Subtask).filter(Subtask.id == item.subtask_id).first()
        subtask_name = subtask.subtask_name if subtask else ""
    
    return DailyItemResponse(
        id=item.id,
        date=item.date.isoformat(),
        task_id=item.task_id,
        task_name=task.task_name if task else "",
        subtask_id=item.subtask_id if item.subtask_id is not None else 0,
        subtask_name=subtask_name,
        allocated_hours=item.allocated_hours,
        is_completed=item.is_completed,
        importance=task.importance if task else "medium"
    )
