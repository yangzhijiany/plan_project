from sqlalchemy import Column, Integer, String, Date, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import date, datetime
import uuid

Base = declarative_base()


class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, nullable=False, index=True)  # 唯一用户ID
    nickname = Column(String, nullable=False, index=True)  # 昵称
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关联关系
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")


class Task(Base):
    """任务表"""
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # 用户ID
    task_name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)  # 自然语言描述
    importance = Column(String, default="medium")  # low, medium, high
    is_long_term = Column(Boolean, default=False)  # 是否长期任务
    deadline = Column(Date, nullable=True, index=True)  # 截止日期，长期任务为 None
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关联关系
    user = relationship("User", back_populates="tasks")
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan")
    daily_items = relationship("DailyTaskItem", back_populates="task", cascade="all, delete-orphan")


class Subtask(Base):
    """子任务表"""
    __tablename__ = "subtasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    subtask_name = Column(String, nullable=False)
    estimated_hours = Column(Float, nullable=False, default=0.0)  # 预计时间（小时）
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关联关系
    task = relationship("Task", back_populates="subtasks")
    daily_items = relationship("DailyTaskItem", back_populates="subtask", cascade="all, delete-orphan")


class DailyTaskItem(Base):
    """每日任务项表"""
    __tablename__ = "daily_task_items"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    subtask_id = Column(Integer, ForeignKey("subtasks.id"), nullable=True, index=True)  # 长期任务可以为 NULL
    allocated_hours = Column(Float, nullable=False, default=0.0)  # 分配的时间（小时）
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关联关系
    task = relationship("Task", back_populates="daily_items")
    subtask = relationship("Subtask", back_populates="daily_items")


# 保留旧表以兼容现有数据
class DailyPlan(Base):
    __tablename__ = "daily_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    tasks = Column(String, nullable=False)  # JSON 字符串格式存储任务列表

