"""
Database Models for Asana-Bridge
SQLAlchemy ORM models with async support
"""

from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Boolean,
    ForeignKey, JSON, Enum as SQLEnum, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from datetime import datetime
import enum

Base = declarative_base()


class UserRole(enum.Enum):
    PATIENT = "patient"
    TRAINER = "trainer"
    DOCTOR = "doctor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    full_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    sessions = relationship("Session", back_populates="patient", foreign_keys="Session.patient_id")
    routines = relationship("Routine", back_populates="trainer")
    reviews = relationship("Review", back_populates="trainer")
    rom_records = relationship("ROMHistory", back_populates="patient")


class Assignment(Base):
    """Links patients to their trainers and doctors"""
    __tablename__ = "assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("User", foreign_keys=[patient_id])
    trainer = relationship("User", foreign_keys=[trainer_id])
    doctor = relationship("User", foreign_keys=[doctor_id])


class Routine(Base):
    """Yoga routines created by trainers"""
    __tablename__ = "routines"
    
    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    poses = Column(JSON, nullable=False)  # List of pose configs
    duration_minutes = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    trainer = relationship("User", back_populates="routines")
    sessions = relationship("Session", back_populates="routine")


class Session(Base):
    """Patient practice sessions"""
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    routine_id = Column(Integer, ForeignKey("routines.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    avg_score = Column(Float, nullable=True)
    
    # Relationships
    patient = relationship("User", back_populates="sessions", foreign_keys=[patient_id])
    routine = relationship("Routine", back_populates="sessions")
    frames = relationship("LandmarkFrame", back_populates="session")
    reviews = relationship("Review", back_populates="session")


class LandmarkFrame(Base):
    """Individual frames with landmark data for replay"""
    __tablename__ = "landmark_frames"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    landmarks = Column(JSON, nullable=False)  # 33 landmarks
    pose_name = Column(String(100), nullable=True)
    score = Column(Float, nullable=True)
    timestamp = Column(Float, nullable=False)
    
    # Relationships
    session = relationship("Session", back_populates="frames")


class ROMHistory(Base):
    """Range of Motion tracking for doctors"""
    __tablename__ = "rom_history"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joint_name = Column(String(100), nullable=False)
    angle_degrees = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("User", back_populates="rom_records")


class Review(Base):
    """Trainer reviews on sessions"""
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text_feedback = Column(Text, nullable=False)
    audio_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="reviews")
    trainer = relationship("User", back_populates="reviews")


class IdealPose(Base):
    """Reference poses for comparison"""
    __tablename__ = "ideal_poses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    landmarks = Column(JSON, nullable=False)  # Normalized landmarks
    angle_rules = Column(JSON, nullable=True)  # For feedback generation
    created_at = Column(DateTime, default=datetime.utcnow)


# Database setup
DATABASE_URL = "sqlite+aiosqlite:///./asana_bridge.db"

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency for getting database session"""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
