"""
Pydantic Schemas for Asana-Bridge API
Defines request/response models for all endpoints
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums
class UserRole(str, Enum):
    PATIENT = "patient"
    TRAINER = "trainer"
    DOCTOR = "doctor"
    ADMIN = "admin"


class PoseStatus(str, Enum):
    PERFECT = "perfect"
    GOOD = "good"
    NEEDS_WORK = "needs_work"
    POOR = "poor"


# Auth Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
    full_name: str


class UserResponse(BaseModel):
    id: int
    email: str
    role: str  # Changed from UserRole to str for SQLAlchemy compatibility
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[UserRole] = None


# Pose Analysis Schemas
class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float
    visibility: Optional[float] = None


class PoseFrame(BaseModel):
    """Single frame of pose data"""
    landmarks: List[LandmarkPoint]
    timestamp: float
    frame_number: int


class PoseAnalysisResponse(BaseModel):
    """Response sent via WebSocket after each frame"""
    score: float
    status: PoseStatus
    feedback: List[str]
    user_landmarks: List[List[float]]  # 33 x 3
    ghost_landmarks: List[List[float]]  # Ideal pose for overlay
    balance_warning: Optional[str] = None
    fall_detected: bool = False


class CenterOfMass(BaseModel):
    x: float
    y: float
    is_balanced: bool
    warning: Optional[str] = None


# Routine Schemas
class PoseConfig(BaseModel):
    name: str
    duration_seconds: int = 30
    repetitions: int = 1


class RoutineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    poses: List[PoseConfig]
    duration_minutes: int


class RoutineResponse(BaseModel):
    id: int
    trainer_id: int
    name: str
    description: Optional[str]
    poses: List[PoseConfig]
    duration_minutes: int
    created_at: datetime

    class Config:
        from_attributes = True


# Session Schemas
class SessionCreate(BaseModel):
    routine_id: int


class SessionResponse(BaseModel):
    id: int
    patient_id: int
    routine_id: int
    started_at: datetime
    ended_at: Optional[datetime]
    avg_score: Optional[float]

    class Config:
        from_attributes = True


class SessionReplay(BaseModel):
    """Skeletal data for session replay"""
    session_id: int
    frames: List[PoseFrame]
    total_frames: int
    avg_score: float


# Review Schemas
class ReviewCreate(BaseModel):
    session_id: int
    text_feedback: str
    audio_url: Optional[str] = None


class ReviewResponse(BaseModel):
    id: int
    session_id: int
    trainer_id: int
    text_feedback: str
    audio_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ROM (Range of Motion) Schemas
class ROMDataPoint(BaseModel):
    joint_name: str
    angle_degrees: float
    recorded_at: datetime


class ROMHistory(BaseModel):
    patient_id: int
    patient_name: str
    joint_name: str
    data_points: List[ROMDataPoint]
    avg_angle: float
    min_angle: float
    max_angle: float


# Admin Training Schemas
class TrainingRequest(BaseModel):
    dataset_path: str
    model_name: str = "pose_classifier"
    epochs: int = 50
    batch_size: int = 32


class TrainingProgress(BaseModel):
    status: str  # "preparing", "training", "completed", "failed"
    epoch: int
    total_epochs: int
    accuracy: float
    loss: float
    message: str


class TrainingResult(BaseModel):
    success: bool
    model_path: str
    accuracy: float
    num_classes: int
    class_names: List[str]


# Assignment Schemas
class AssignmentCreate(BaseModel):
    patient_id: int
    trainer_id: Optional[int] = None
    doctor_id: Optional[int] = None


class AssignmentResponse(BaseModel):
    id: int
    patient_id: int
    trainer_id: Optional[int]
    doctor_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
