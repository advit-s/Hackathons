"""
FastAPI Main Application for Asana-Bridge
Real-time yoga pose analysis with WebSocket streaming
"""

import os
import io
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import numpy as np

from database import init_db, get_db, User, Session as DBSession, LandmarkFrame, IdealPose, Routine
from schemas import (
    UserCreate, UserResponse, Token, TokenData, UserRole,
    PoseAnalysisResponse, PoseStatus, RoutineCreate, RoutineResponse,
    SessionCreate, SessionResponse, TrainingRequest, TrainingResult
)
# Use MoveNet instead of MediaPipe
from ml_engine_movenet import (
    get_extractor, cleanup, compute_pose_embedding, normalize_landmarks,
    cosine_similarity, similarity_to_score, check_balance, detect_fall,
    generate_feedback, calculate_body_angles, PoseClassifier, embedding_to_landmarks
)


# ==================== CONFIGURATION ====================

SECRET_KEY = os.getenv("SECRET_KEY", "asana-bridge-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# ==================== APP SETUP ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("🧘 Asana-Bridge Starting...")
    await init_db()
    print("📦 Database initialized")
    
    # Load pose classifier if exists
    model_path = "./models/pose_classifier.h5"
    if os.path.exists(model_path):
        app.state.classifier = PoseClassifier(model_path)
        print(f"🤖 Loaded pose classifier: {model_path}")
    else:
        app.state.classifier = None
        print("⚠️ No pose classifier found. Train one at /admin/train")
    
    # Load ideal poses
    app.state.ideal_poses = await load_ideal_poses()
    print(f"📐 Loaded {len(app.state.ideal_poses)} ideal poses")
    
    print("✅ Server ready!")
    yield
    
    # Cleanup
    cleanup()
    print("👋 Asana-Bridge shutting down...")


app = FastAPI(
    title="Asana-Bridge API",
    description="Real-time AI Yoga Pose Analysis Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== AUTH ====================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain[:72], hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password[:72])


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    return user


def require_role(*roles: UserRole):
    """Dependency to require specific roles"""
    async def role_checker(user: User = Depends(get_current_user)):
        if user.role.value not in [r.value for r in roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return user
    return role_checker


# ==================== HELPER FUNCTIONS ====================

async def load_ideal_poses() -> Dict[str, np.ndarray]:
    """Load ideal pose embeddings from files or database"""
    poses = {}
    
    # Load from reference_embeddings folder
    ref_dir = "./reference_embeddings"
    if os.path.exists(ref_dir):
        for filename in os.listdir(ref_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(ref_dir, filename)
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    pose_name = data.get('pose_name', filename.replace('.json', ''))
                    if 'embeddings' in data and len(data['embeddings']) > 0:
                        embedding = np.array(data['embeddings'][0]['embedding'], dtype=np.float32)
                        poses[pose_name] = embedding
    
    return poses


# ==================== AUTH ENDPOINTS ====================

@app.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    from database import UserRole as DBUserRole
    import traceback
    
    try:
        # Check if email exists
        result = await db.execute(select(User).where(User.email == user_data.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Convert Pydantic enum to SQLAlchemy enum
        db_role = DBUserRole(user_data.role.value)
        
        user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            role=db_role,
            full_name=user_data.full_name
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Registration error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Login and get access token"""
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info"""
    return user


# ==================== HEALTH CHECK ====================

@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "available_poses": list(app.state.ideal_poses.keys()) if hasattr(app.state, 'ideal_poses') else []
    }


# ==================== WEBSOCKET POSE STREAMING ====================

class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: int):
        await websocket.accept()
        self.active_connections[session_id] = websocket
    
    def disconnect(self, session_id: int):
        self.active_connections.pop(session_id, None)
    
    async def send_json(self, session_id: int, data: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(data)


manager = ConnectionManager()


@app.websocket("/ws/pose/{session_id}")
async def pose_websocket(
    websocket: WebSocket, 
    session_id: int,
    pose_name: str = "tadasana"
):
    """
    WebSocket endpoint for real-time pose analysis.
    """
    print(f"🔌 WebSocket connecting: session={session_id}, pose={pose_name}")
    await manager.connect(websocket, session_id)
    print(f"✅ WebSocket connected: session={session_id}")
    
    extractor = get_extractor()
    prev_landmarks = None
    frame_number = 0
    
    # Get ideal pose embedding from trained model
    ideal_embedding = app.state.ideal_poses.get(pose_name)
    print(f"📊 Using pose: {pose_name}, has ideal: {ideal_embedding is not None}")
    
    # Send an initial "Ready" message
    await websocket.send_json({"status": "connected", "message": "Analyzer ready"})

    try:
        while True:
            # Receive frame bytes
            try:
                frame_data = await websocket.receive_bytes()
            except Exception as recv_error:
                print(f"❌ Receive error at frame {frame_number}: {recv_error}")
                break
            
            try:
                # Extract landmarks
                landmarks = extractor.extract_from_bytes(frame_data)
                
                if landmarks is None:
                    await websocket.send_json({
                        "detected": False,
                        "message": "Step back so your full body is visible",
                        "frame_number": frame_number
                    })
                    frame_number += 1
                    continue
                
                # Compute embedding from landmarks
                embedding = compute_pose_embedding(landmarks)
                
                # Calculate score (no smoothing - direct feedback)
                if ideal_embedding is not None:
                    try:
                        similarity = cosine_similarity(embedding, ideal_embedding)
                        score = similarity_to_score(similarity)
                    except Exception as sim_error:
                        print(f"⚠️ Similarity calculation error: {sim_error}")
                        score = 50.0  # Default score
                else:
                    # Use angles-based scoring if no ideal embedding
                    try:
                        angles = calculate_body_angles(landmarks)
                        # Score based on posture quality
                        knee_avg = (angles.get('left_knee', 170) + angles.get('right_knee', 170)) / 2
                        shoulder_avg = (angles.get('left_shoulder', 90) + angles.get('right_shoulder', 90)) / 2
                        # Better posture = higher score
                        posture_score = min(100, max(30, 100 - abs(knee_avg - 170) - abs(shoulder_avg - 90) * 0.3))
                        score = round(posture_score, 1)
                    except Exception as angle_error:
                        print(f"⚠️ Angle calculation error: {angle_error}")
                        score = 50.0  # Default score
                
                # Determine status
                if score >= 85:
                    status = PoseStatus.PERFECT
                elif score >= 70:
                    status = PoseStatus.GOOD
                elif score >= 50:
                    status = PoseStatus.NEEDS_WORK
                else:
                    status = PoseStatus.POOR
                
                # Generate feedback every 10 frames
                feedback = []
                if frame_number % 10 == 0:
                    ideal_landmarks = None
                    if ideal_embedding is not None:
                        ideal_landmarks = embedding_to_landmarks(ideal_embedding)
                    
                    # Generate dynamic feedback based on ideal pose
                    if ideal_landmarks is not None:
                         feedback = generate_feedback(landmarks, ideal_landmarks)
                    else:
                         # Fallback if no ideal pose available (e.g. unknown pose)
                         if score >= 85:
                            feedback.append("Excellent form!")
                         elif score < 50:
                            feedback.append("Try to mimic the pose shown")
                
                # Prepare response (17 landmarks for MoveNet)
                response = {
                    "detected": True,
                    "score": round(score, 1),
                    "status": status.value,
                    "feedback": feedback,
                    "user_landmarks": landmarks[:, :3].tolist(),  # 17x3 for MoveNet
                    "ghost_landmarks": None,
                    "balance_warning": None,
                    "fall_detected": False,
                    "fall_message": None,
                    "frame_number": frame_number,
                    "pose_name": pose_name,
                    "num_keypoints": 17  # MoveNet uses 17 keypoints
                }
                
                await websocket.send_json(response)
                
                prev_landmarks = landmarks
                frame_number += 1
                
                # Small pause to avoid overwhelming the tunnel
                await asyncio.sleep(0.01)
                
            except Exception as process_error:
                print(f"❌ Processing error at frame {frame_number}: {process_error}")
                import traceback
                traceback.print_exc()
                await websocket.send_json({
                    "detected": False,
                    "error": str(process_error),
                    "frame_number": frame_number
                })
                frame_number += 1
            
    except WebSocketDisconnect:
        print(f"🔌 WebSocket {session_id} disconnected (normal)")
        manager.disconnect(session_id)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        manager.disconnect(session_id)


# ==================== ROUTINE ENDPOINTS ====================

@app.post("/api/routines", response_model=RoutineResponse)
async def create_routine(
    routine: RoutineCreate,
    user: User = Depends(require_role(UserRole.TRAINER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """Create a new yoga routine (Trainer only)"""
    db_routine = Routine(
        trainer_id=user.id,
        name=routine.name,
        description=routine.description,
        poses=[p.model_dump() for p in routine.poses],
        duration_minutes=routine.duration_minutes
    )
    db.add(db_routine)
    await db.commit()
    await db.refresh(db_routine)
    return db_routine


@app.get("/api/routines", response_model=List[RoutineResponse])
async def list_routines(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List routines (filtered by role)"""
    if user.role == UserRole.TRAINER:
        result = await db.execute(select(Routine).where(Routine.trainer_id == user.id))
    else:
        result = await db.execute(select(Routine))
    
    return result.scalars().all()


# ==================== SESSION ENDPOINTS ====================

@app.post("/api/sessions", response_model=SessionResponse)
async def create_session(
    session: SessionCreate,
    user: User = Depends(require_role(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db)
):
    """Start a new practice session"""
    db_session = DBSession(
        patient_id=user.id,
        routine_id=session.routine_id
    )
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    return db_session


@app.get("/api/sessions/{session_id}/replay")
async def get_session_replay(
    session_id: int,
    user: User = Depends(require_role(UserRole.TRAINER, UserRole.DOCTOR, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """Get session replay data (skeletal frames)"""
    result = await db.execute(
        select(LandmarkFrame)
        .where(LandmarkFrame.session_id == session_id)
        .order_by(LandmarkFrame.frame_number)
    )
    frames = result.scalars().all()
    
    return {
        "session_id": session_id,
        "total_frames": len(frames),
        "frames": [
            {
                "frame_number": f.frame_number,
                "landmarks": f.landmarks,
                "score": f.score,
                "timestamp": f.timestamp
            }
            for f in frames
        ]
    }


# ==================== ROM ENDPOINTS (Doctor) ====================

@app.get("/api/rom/{patient_id}")
async def get_rom_history(
    patient_id: int,
    joint_name: Optional[str] = None,
    user: User = Depends(require_role(UserRole.DOCTOR, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """Get Range of Motion history for a patient"""
    from database import ROMHistory as DBROMHistory
    
    try:
        query = select(DBROMHistory).where(DBROMHistory.patient_id == patient_id)
        if joint_name:
            query = query.where(DBROMHistory.joint_name == joint_name)
        query = query.order_by(DBROMHistory.recorded_at)
        
        result = await db.execute(query)
        records = result.scalars().all()
        
        # Group by joint
        grouped = {}
        for record in records:
            if record.joint_name not in grouped:
                grouped[record.joint_name] = []
            grouped[record.joint_name].append({
                "angle_degrees": record.angle_degrees,
                "recorded_at": record.recorded_at.isoformat()
            })
        
        return {
            "patient_id": patient_id,
            "joints": grouped
        }
    except Exception as e:
        print(f"❌ Error fetching ROM history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ADMIN TRAINING ENDPOINT ====================

@app.post("/admin/train", response_model=TrainingResult)
async def train_model(
    request: TrainingRequest,
    user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Train a new pose classifier from a dataset.
    Hidden admin route.
    """
    from training_movenet import load_dataset_from_folder, train_model as do_train, save_model
    
    try:
        # Load dataset
        X, y, class_names = load_dataset_from_folder(request.dataset_path)
        
        if len(X) == 0:
            raise HTTPException(status_code=400, detail="No valid samples found")
        
        # Train
        model, history = do_train(
            X, y, class_names,
            epochs=request.epochs,
            batch_size=request.batch_size
        )
        
        # Save
        output_path = f"./models/{request.model_name}.h5"
        save_model(model, output_path, class_names, history)
        
        # Reload classifier
        app.state.classifier = PoseClassifier(output_path)
        
        return TrainingResult(
            success=True,
            model_path=output_path,
            accuracy=float(history['val_accuracy'][-1]),
            num_classes=len(class_names),
            class_names=class_names
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
