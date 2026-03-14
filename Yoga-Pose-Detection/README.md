# 🧘 Asana-Bridge — AI-Powered Yoga Pose Analysis Platform

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![TensorFlow](https://img.shields.io/badge/TensorFlow-FF6F00?style=flat&logo=tensorflow&logoColor=white)

A full-stack real-time yoga coaching platform that uses **MediaPipe** pose detection, a custom **DNN classifier**, and **WebSocket streaming** to provide instant, personalized feedback on yoga poses.

---

## 🎯 Features

- **Real-Time Pose Detection** — MediaPipe Pose with 17-landmark skeleton mapping
- **DNN Pose Classifier** — Custom TensorFlow/Keras neural network trained on 20,000+ images (98% accuracy)
- **7 Pose Classes** — Chair, Cobra, Downdog, Goddess, Tree, Warrior + Not-Yoga detection
- **WebSocket Streaming** — Live pose analysis at low latency via FastAPI WebSocket
- **Role-Based Dashboard** — Separate views for Patients, Trainers, Doctors, and Admins
- **Voice Coaching** — TTS-powered real-time audio corrections
- **Session Replay** — Trainers and Doctors can review patient session recordings
- **Range of Motion (ROM) Tracking** — Doctors can monitor joint angle progress over time
- **Fall Detection** — Automatic safety alerts for rapid downward movement
- **Cloudflare Tunnel Ready** — Deploy publicly with zero infrastructure

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Webcam
- NVIDIA GPU (optional, for faster training)

### 1. Backend Setup

```bash
cd asana-bridge/backend

# Create and activate virtual environment
python -m venv ../../.venv311
../../.venv311/Scripts/Activate.ps1   # Windows PowerShell
# source ../../.venv311/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

Backend runs at `http://localhost:8000` — API docs at `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd asana-bridge/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at `http://localhost:5173`

### 3. Connect Frontend → Backend

Edit `asana-bridge/frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## 🌐 Deploy with Cloudflare Tunnel

Expose your local app to the internet with zero configuration:

```bash
# Terminal 1: Backend tunnel
cloudflared tunnel --url http://localhost:8000
# → Gives you: https://xxxx.trycloudflare.com

# Terminal 2: Frontend tunnel
cloudflared tunnel --url http://localhost:5173
# → Gives you: https://yyyy.trycloudflare.com (share this link!)
```

Update `frontend/.env` with the backend tunnel URL:

```env
VITE_API_URL=https://xxxx.trycloudflare.com
VITE_WS_URL=wss://xxxx.trycloudflare.com
```

---

## 📁 Project Structure

```
yoga-ai/
├── asana-bridge/
│   ├── backend/
│   │   ├── main.py                 # FastAPI server, auth, WebSocket, REST API
│   │   ├── ml_engine_movenet.py    # MediaPipe pose extractor + DNN classifier
│   │   ├── training_movenet.py     # Model training script
│   │   ├── augment_dataset.py      # Dataset augmentation pipeline
│   │   ├── database.py             # SQLAlchemy models (async SQLite)
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── verify_deployment.py    # Health check utility
│   │   ├── requirements.txt        # Python dependencies
│   │   ├── models/                 # Trained model (.h5 + metadata)
│   │   └── reference_embeddings/   # Per-pose reference vectors
│   │
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── App.jsx             # Main app with routing
│   │   │   ├── pages/              # Login, Patient/Trainer/Doctor/Admin dashboards
│   │   │   ├── components/         # CameraView, PoseAnalyzer, Charts, UI
│   │   │   ├── hooks/              # useWebSocket for real-time streaming
│   │   │   └── services/           # API client, auth, pose utilities
│   │   ├── .env                    # API/WebSocket URL config
│   │   └── vite.config.js          # Vite + React config
│   │
│   └── database/
│       └── schema.sql              # Database schema reference
│
├── yoga_dataset_6poses/            # Original training dataset
├── yoga_dataset_6poses_augmented/  # Augmented dataset (10x expanded)
├── .venv311/                       # Python virtual environment
└── README.md
```

---

## 🔧 Technical Architecture

### Backend — FastAPI + MediaPipe + TensorFlow

| Component | Description |
|:---|:---|
| `ml_engine_movenet.py` | MediaPipe Pose → 17-landmark extraction → 67-dim embedding → DNN classification |
| `main.py` | Auth (JWT + bcrypt), REST endpoints, WebSocket `/ws/pose/{session_id}` |
| `database.py` | Async SQLite via SQLAlchemy (Users, Sessions, Frames, IdealPoses, ROM) |
| `training_movenet.py` | Multi-threaded dataset loader, Keras DNN trainer, reference embedding generator |

### Frontend — React + Vite + TailwindCSS

| Component | Description |
|:---|:---|
| `CameraView.jsx` | Webcam capture via `getUserMedia` |
| `PoseAnalyzer/` | Real-time skeleton overlay with color-coded feedback |
| `useWebSocket.js` | WebSocket hook for live pose streaming |
| Role-based pages | Patient, Trainer, Doctor, Admin dashboards |

### Data Flow

```
Camera → WebSocket → FastAPI → MediaPipe → DNN Classifier → Score + Feedback → WebSocket → UI
```

---

## �️ Training the Model

### Retrain with Your Own Data

```bash
cd asana-bridge/backend

# Augment dataset (optional — 10x expansion with transforms)
python augment_dataset.py --input ../../yoga_dataset_6poses --output ../../yoga_dataset_6poses_augmented

# Train the classifier
python training_movenet.py \
  --dataset ../../yoga_dataset_6poses_augmented \
  --output ./models/pose_classifier.h5 \
  --generate-refs \
  --epochs 100 \
  --batch-size 32 \
  --extractor mediapipe
```

### Model Specs

| Metric | Value |
|:---|:---|
| Architecture | Dense(256) → BN → Dropout → Dense(128) → BN → Dropout → Dense(64) → BN → Dropout → Softmax(7) |
| Input Dimension | 67 (17 landmarks × 3 coords + 14 pairwise distances + 2 extra) |
| Training Accuracy | **98.11%** |
| Dataset Size | 20,247 unique pose samples |
| Classes | chair, cobra, downdog, goddess, not_yoga, tree, warrior |

---

## 👥 User Roles

| Role | Capabilities |
|:---|:---|
| **Patient** | Practice poses, view scores, real-time coaching |
| **Trainer** | Create routines, review patient sessions, session replay |
| **Doctor** | ROM tracking, patient progress monitoring |
| **Admin** | Retrain models via `/admin/train` endpoint |

---

## 🎨 Visual Feedback

| Score | Color | Status |
|:---|:---|:---|
| 90–100 | 🟢 Green | Perfect |
| 75–89 | 🔵 Blue | Good |
| 50–74 | 🟠 Orange | Needs Adjustment |
| 0–49 | 🔴 Red | Keep Trying |

---

## 📦 Dependencies

### Backend

- `fastapi` + `uvicorn` — Async web server
- `tensorflow` + `tensorflow-hub` — DNN classifier
- `mediapipe` — Pose landmark detection
- `sqlalchemy` + `aiosqlite` — Async database
- `passlib` + `python-jose` — Auth (bcrypt + JWT)
- `numpy` + `pillow` — Image processing

### Frontend

- `react` + `react-router-dom` — UI framework
- `vite` — Build tool
- `tailwindcss` — Styling
- `axios` — HTTP client

---

## 🐛 Troubleshooting

| Problem | Solution |
|:---|:---|
| `ModuleNotFoundError: fastapi` | Run `pip install -r requirements.txt` in backend dir |
| `email-validator not installed` | Run `pip install pydantic[email]` |
| 500 on registration | Run `pip install bcrypt==4.0.1` (version compatibility fix) |
| Camera not working | Use HTTPS or localhost — `getUserMedia` requires secure context |
| WebSocket fails on tunnel | Ensure `.env` uses `wss://` (not `ws://`) for tunnel URLs |
| Low pose detection | Lower `min_detection_confidence` in `ml_engine_movenet.py` |

---

## 📄 License

MIT License — Free for educational and personal use.

---

## 🙏 Acknowledgments

- **MediaPipe** by Google — Pose detection engine
- **TensorFlow/Keras** — DNN classifier training
- **FastAPI** by Sebastián Ramírez — Backend framework
- **Cloudflare Tunnel** — Zero-config public deployment