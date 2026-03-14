"""
ML Engine for Asana-Bridge with MoveNet
Real-time pose analysis using PIL + TensorFlow Hub MoveNet (NO OpenCV)
Custom DNN classifier with TensorFlow/Keras
"""

import io
import numpy as np
from PIL import Image
from typing import Optional, Tuple, List, Dict, Any
import tensorflow as tf
from tensorflow import keras
from keras import layers
import tensorflow_hub as hub
import mediapipe as mp
import mediapipe.python.solutions.pose as mp_pose
import mediapipe.python.solutions.drawing_utils as mp_drawing


# MoveNet model URLs (Kaggle mirror - works with TF 2.20+)
MOVENET_LIGHTNING_URL = "https://www.kaggle.com/models/google/movenet/TensorFlow2/singlepose-lightning/4"
MOVENET_THUNDER_URL = "https://www.kaggle.com/models/google/movenet/TensorFlow2/singlepose-thunder/4"


# Body segment weights for Center of Mass calculation
SEGMENT_WEIGHTS = {
    "head": 0.08,       # Nose area
    "torso": 0.50,      # Shoulders + Hips
    "left_arm": 0.05,
    "right_arm": 0.05,
    "left_leg": 0.16,
    "right_leg": 0.16
}

# MoveNet keypoint indices (17 keypoints)
MOVENET_KEYPOINTS = {
    'NOSE': 0,
    'LEFT_EYE': 1,
    'RIGHT_EYE': 2,
    'LEFT_EAR': 3,
    'RIGHT_EAR': 4,
    'LEFT_SHOULDER': 5,
    'RIGHT_SHOULDER': 6,
    'LEFT_ELBOW': 7,
    'RIGHT_ELBOW': 8,
    'LEFT_WRIST': 9,
    'RIGHT_WRIST': 10,
    'LEFT_HIP': 11,
    'RIGHT_HIP': 12,
    'LEFT_KNEE': 13,
    'RIGHT_KNEE': 14,
    'LEFT_ANKLE': 15,
    'RIGHT_ANKLE': 16,
}

# Pairwise distances for embedding (reduced for 17 keypoints)
DISTANCE_PAIRS = [
    (5, 9), (6, 10),    # Shoulder to wrist
    (5, 7), (6, 8),     # Shoulder to elbow
    (7, 9), (8, 10),    # Elbow to wrist
    (11, 15), (12, 16), # Hip to ankle
    (11, 13), (12, 14), # Hip to knee
    (13, 15), (14, 16), # Knee to ankle
    (5, 6), (11, 12),   # Shoulder/hip width
    (5, 12), (6, 11),   # Cross torso
]


class MediaPipePoseExtractor:
    """
    GPU-accelerated Pose Extractor using MediaPipe.
    Maps MediaPipe's 33 landmarks to MoveNet's 17 landmarks for compatibility.
    """
    def __init__(self):
        # MoveNet to MediaPipe mapping (ID to ID)
        self.mapping = {
            0: 0,   # nose
            1: 2,   # left eye
            2: 5,   # right eye
            3: 7,   # left ear
            4: 8,   # right ear
            5: 11,  # left shoulder
            6: 12,  # right shoulder
            7: 13,  # left elbow
            8: 14,  # right elbow
            9: 15,  # left wrist
            10: 16, # right wrist
            11: 23, # left hip
            12: 24, # right hip
            13: 25, # left knee
            14: 26, # right knee
            15: 27, # left ankle
            16: 28  # right ankle
        }
        
        self.mp_pose = mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1, 
            min_detection_confidence=0.3
        )

    def extract_from_pil(self, image: Image.Image) -> Optional[np.ndarray]:
        # Convert PIL to numpy (RGB)
        image_np = np.array(image)
        
        # Process image
        results = self.mp_pose.process(image_np)
        
        if not results.pose_landmarks:
            return None
        
        # MoveNet format: (17, 4) with [x, y, 0, visibility]
        landmarks = np.zeros((17, 4), dtype=np.float32)
        
        for movenet_id, mp_id in self.mapping.items():
            lm = results.pose_landmarks.landmark[mp_id]
            landmarks[movenet_id, 0] = lm.x
            landmarks[movenet_id, 1] = lm.y
            landmarks[movenet_id, 2] = 0.0
            landmarks[movenet_id, 3] = lm.visibility
            
        return landmarks

    def close(self):
        self.mp_pose.close()

class MoveNetExtractor:
    """
    Extract pose landmarks using PIL + TensorFlow Hub MoveNet (NO OpenCV)
    """
    
    def __init__(self, model_type: str = "lightning"):
        """
        Initialize MoveNet model.
        
        Args:
            model_type: "lightning" (fast, 192x192) or "thunder" (accurate, 256x256)
        """
        self.model_type = model_type
        
        # Load MoveNet model from Kaggle (works with TF 2.20+)
        if model_type == "thunder":
            self.model = hub.load(MOVENET_THUNDER_URL)
            self.input_size = 256
        else:
            self.model = hub.load(MOVENET_LIGHTNING_URL)
            self.input_size = 192
        
        # Kaggle models expose the function directly, not via signatures
        if hasattr(self.model, 'signatures') and 'serving_default' in self.model.signatures:
            self.movenet = self.model.signatures['serving_default']
        else:
            self.movenet = self.model  # Direct callable
        print(f"✅ MoveNet {model_type.upper()} model loaded (input size: {self.input_size}x{self.input_size})")
    
    def _preprocess_image(self, image: Image.Image) -> tf.Tensor:
        """
        Preprocess PIL image for MoveNet.
        
        Args:
            image: PIL Image
        
        Returns:
            TensorFlow tensor (1, height, width, 3)
        """
        # Resize to model input size
        image_resized = image.resize((self.input_size, self.input_size))
        
        # Convert to numpy array
        image_array = np.array(image_resized)
        
        # Convert to tensor and expand dimensions
        image_tensor = tf.convert_to_tensor(image_array, dtype=tf.int32)
        image_tensor = tf.expand_dims(image_tensor, axis=0)
        
        return image_tensor
    
    def extract_from_bytes(self, image_bytes: bytes) -> Optional[np.ndarray]:
        """
        Extract landmarks from image bytes.
        
        Args:
            image_bytes: Raw image bytes (JPEG/PNG)
        
        Returns:
            (17, 4) array with (x, y, z=0, confidence) or None if no pose detected
        """
        try:
            # Use PIL to open image (NO OpenCV)
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            return self.extract_from_pil(image)
        except Exception as e:
            print(f"❌ Error extracting from bytes: {e}")
            return None
    
    def extract_from_pil(self, image: Image.Image) -> Optional[np.ndarray]:
        """
        Extract landmarks from PIL Image.
        
        Args:
            image: PIL Image
        
        Returns:
            (17, 4) array with (x, y, z=0, confidence) or None
        """
        # Preprocess image
        input_tensor = self._preprocess_image(image)
        
        # Run inference - handle both Kaggle (direct) and TFHub (signatures) formats
        outputs = self.movenet(input_tensor)
        
        # Extract keypoints: shape is [1, 1, 17, 3] with (y, x, score)
        # Kaggle model returns dict OR direct tensor
        if isinstance(outputs, dict):
            keypoints_with_scores = outputs['output_0'].numpy()
        else:
            keypoints_with_scores = outputs.numpy()
        
        # Reshape to [17, 3]
        keypoints = keypoints_with_scores[0, 0, :, :]

        
        # Check if pose is detected (average confidence threshold)
        avg_confidence = np.mean(keypoints[:, 2])
        if avg_confidence < 0.3:
            return None
        
        # Convert from (y, x, score) to (x, y, z=0, visibility)
        # MoveNet returns normalized coordinates [0, 1]
        landmarks = np.zeros((17, 4), dtype=np.float32)
        landmarks[:, 0] = keypoints[:, 1]  # x
        landmarks[:, 1] = keypoints[:, 0]  # y
        landmarks[:, 2] = 0.0              # z (not available in MoveNet)
        landmarks[:, 3] = keypoints[:, 2]  # confidence/visibility
        
        return landmarks
    
    def close(self):
        """Cleanup resources."""
        # TensorFlow Hub models don't need explicit cleanup
        pass


def normalize_landmarks(landmarks: np.ndarray, 
                        visibility_threshold: float = 0.3) -> Tuple[np.ndarray, np.ndarray]:
    """
    Normalize landmarks to be position and scale invariant.
    
    Normalization:
    1. Center at hip midpoint (translation invariance)
    2. Scale by shoulder width (scale invariance)
    
    Args:
        landmarks: (17, 4) array with (x, y, z, confidence)
        visibility_threshold: Minimum confidence to consider valid
    
    Returns:
        normalized: (17, 3) normalized coordinates
        visibility_mask: (17,) boolean mask of visible landmarks
    """
    coords = landmarks[:, :3]  # x, y, z
    confidence = landmarks[:, 3]
    
    # Create visibility mask
    visibility_mask = confidence > visibility_threshold
    
    # Hip center (translation normalization)
    left_hip = coords[MOVENET_KEYPOINTS['LEFT_HIP']]
    right_hip = coords[MOVENET_KEYPOINTS['RIGHT_HIP']]
    hip_center = (left_hip + right_hip) / 2.0
    
    centered = coords - hip_center
    
    # Shoulder width (scale normalization)
    left_shoulder = coords[MOVENET_KEYPOINTS['LEFT_SHOULDER']]
    right_shoulder = coords[MOVENET_KEYPOINTS['RIGHT_SHOULDER']]
    shoulder_width = np.linalg.norm(left_shoulder - right_shoulder)
    
    scale = max(shoulder_width, 0.01)  # Prevent division by zero
    normalized = centered / scale
    
    # Zero out invisible landmarks
    normalized[~visibility_mask] = 0.0
    
    return normalized, visibility_mask


def compute_pose_embedding(landmarks: np.ndarray) -> np.ndarray:
    """
    Compute a fixed-length embedding vector from landmarks.
    
    The embedding includes:
    - Normalized (x, y, z) coordinates: 17 * 3 = 51 values
    - Pairwise distances: 14 values
    
    Total: 67 values (vs 115 for MediaPipe)
    
    Args:
        landmarks: (17, 4) raw landmarks with confidence
    
    Returns:
        1-D numpy array (65,)
    """
    normalized, _ = normalize_landmarks(landmarks)
    
    # Flatten normalized coordinates
    position_features = normalized.flatten()  # 51 values
    
    # Compute pairwise distances
    distances = []
    for idx1, idx2 in DISTANCE_PAIRS:
        dist = np.linalg.norm(normalized[idx1] - normalized[idx2])
        distances.append(dist)
    
    distance_features = np.array(distances, dtype=np.float32)
    
    # Concatenate
    embedding = np.concatenate([position_features, distance_features])
    
    return embedding.astype(np.float32)


def embedding_to_landmarks(embedding: np.ndarray) -> Optional[np.ndarray]:
    """
    Reconstruct normalized landmarks from embedding.
    
    Args:
        embedding: (67,) embedding vector
    
    Returns:
        (17, 3) normalized landmarks or None if invalid
    """
    if embedding is None or len(embedding) < 51:
        return None
        
    # First 51 values are flattened x,y,z coordinates
    coords_flat = embedding[:51]
    
    # Reshape to (17, 3)
    try:
        landmarks = coords_flat.reshape(17, 3)
        return landmarks
    except ValueError:
        return None


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors.
    
    Returns:
        Similarity in range [-1, 1]
    """
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a < 1e-8 or norm_b < 1e-8:
        return 0.0
    
    return float(np.dot(a, b) / (norm_a * norm_b))


def similarity_to_score(similarity: float, 
                        min_sim: float = 0.5, 
                        max_sim: float = 0.95) -> float:
    """
    Convert cosine similarity to 0-100 score.
    """
    clamped = max(min_sim, min(max_sim, similarity))
    score = (clamped - min_sim) / (max_sim - min_sim) * 100
    return round(score, 1)


def calculate_joint_angle(landmarks: np.ndarray, 
                          joint_a: int, joint_b: int, joint_c: int) -> float:
    """
    Calculate angle at joint_b between joint_a and joint_c.
    
    Returns:
        Angle in degrees (0-180)
    """
    a = landmarks[joint_a, :3]
    b = landmarks[joint_b, :3]
    c = landmarks[joint_c, :3]
    
    ba = a - b
    bc = c - b
    
    dot = np.dot(ba, bc)
    mag_ba = np.linalg.norm(ba)
    mag_bc = np.linalg.norm(bc)
    
    if mag_ba < 1e-8 or mag_bc < 1e-8:
        return 0.0
    
    cos_angle = np.clip(dot / (mag_ba * mag_bc), -1.0, 1.0)
    angle = np.degrees(np.arccos(cos_angle))
    
    return float(angle)


def calculate_body_angles(landmarks: np.ndarray) -> Dict[str, float]:
    """
    Calculate all relevant body angles with MoveNet keypoints.
    
    Returns:
        Dictionary of angle measurements
    """
    idx = MOVENET_KEYPOINTS
    
    angles = {
        'left_elbow': calculate_joint_angle(landmarks, idx['LEFT_SHOULDER'], idx['LEFT_ELBOW'], idx['LEFT_WRIST']),
        'right_elbow': calculate_joint_angle(landmarks, idx['RIGHT_SHOULDER'], idx['RIGHT_ELBOW'], idx['RIGHT_WRIST']),
        'left_shoulder': calculate_joint_angle(landmarks, idx['LEFT_HIP'], idx['LEFT_SHOULDER'], idx['LEFT_ELBOW']),
        'right_shoulder': calculate_joint_angle(landmarks, idx['RIGHT_HIP'], idx['RIGHT_SHOULDER'], idx['RIGHT_ELBOW']),
        'left_hip': calculate_joint_angle(landmarks, idx['LEFT_SHOULDER'], idx['LEFT_HIP'], idx['LEFT_KNEE']),
        'right_hip': calculate_joint_angle(landmarks, idx['RIGHT_SHOULDER'], idx['RIGHT_HIP'], idx['RIGHT_KNEE']),
        'left_knee': calculate_joint_angle(landmarks, idx['LEFT_HIP'], idx['LEFT_KNEE'], idx['LEFT_ANKLE']),
        'right_knee': calculate_joint_angle(landmarks, idx['RIGHT_HIP'], idx['RIGHT_KNEE'], idx['RIGHT_ANKLE']),
    }
    
    return angles


def calculate_center_of_mass(landmarks: np.ndarray) -> np.ndarray:
    """
    Calculate weighted center of mass.
    
    Uses body segment weights for realistic CoM estimation.
    
    Returns:
        (3,) array with (x, y, z) CoM position
    """
    coords = landmarks[:, :3]
    idx = MOVENET_KEYPOINTS
    
    # Segment positions
    head = coords[idx['NOSE']]
    
    torso = (
        coords[idx['LEFT_SHOULDER']] + 
        coords[idx['RIGHT_SHOULDER']] +
        coords[idx['LEFT_HIP']] + 
        coords[idx['RIGHT_HIP']]
    ) / 4
    
    left_arm = (coords[idx['LEFT_SHOULDER']] + coords[idx['LEFT_ELBOW']] + coords[idx['LEFT_WRIST']]) / 3
    right_arm = (coords[idx['RIGHT_SHOULDER']] + coords[idx['RIGHT_ELBOW']] + coords[idx['RIGHT_WRIST']]) / 3
    
    left_leg = (coords[idx['LEFT_HIP']] + coords[idx['LEFT_KNEE']] + coords[idx['LEFT_ANKLE']]) / 3
    right_leg = (coords[idx['RIGHT_HIP']] + coords[idx['RIGHT_KNEE']] + coords[idx['RIGHT_ANKLE']]) / 3
    
    # Weighted sum
    com = (
        head * SEGMENT_WEIGHTS['head'] +
        torso * SEGMENT_WEIGHTS['torso'] +
        left_arm * SEGMENT_WEIGHTS['left_arm'] +
        right_arm * SEGMENT_WEIGHTS['right_arm'] +
        left_leg * SEGMENT_WEIGHTS['left_leg'] +
        right_leg * SEGMENT_WEIGHTS['right_leg']
    )
    
    return com


def check_balance(landmarks: np.ndarray) -> Dict:
    """
    Check if Center of Mass is within Base of Support.
    
    Returns:
        Dictionary with balance status and warning
    """
    com = calculate_center_of_mass(landmarks)
    idx = MOVENET_KEYPOINTS
    
    # Base of support (between feet)
    left_ankle = landmarks[idx['LEFT_ANKLE'], :2]  # x, y
    right_ankle = landmarks[idx['RIGHT_ANKLE'], :2]
    
    # Check if CoM x-coordinate is between ankles
    min_x = min(left_ankle[0], right_ankle[0]) - 0.05  # Small margin
    max_x = max(left_ankle[0], right_ankle[0]) + 0.05
    
    is_balanced = min_x <= com[0] <= max_x
    
    return {
        'is_balanced': is_balanced,
        'com_position': com.tolist(),
        'warning': None if is_balanced else "⚠️ Balance Warning: Adjust your stance"
    }


def detect_fall(landmarks: np.ndarray, 
                prev_landmarks: Optional[np.ndarray] = None,
                velocity_threshold: float = 0.3) -> Dict:
    """
    Detect potential fall based on rapid downward movement.
    
    Args:
        landmarks: Current frame landmarks
        prev_landmarks: Previous frame landmarks
        velocity_threshold: Max allowed downward velocity
    
    Returns:
        Dictionary with fall detection status
    """
    if prev_landmarks is None:
        return {'fall_detected': False, 'message': None}
    
    # Check hip center velocity (MoveNet indices)
    curr_hip = (landmarks[11, :3] + landmarks[12, :3]) / 2
    prev_hip = (prev_landmarks[11, :3] + prev_landmarks[12, :3]) / 2
    
    # Downward velocity (positive y is down in image coords)
    velocity_y = curr_hip[1] - prev_hip[1]
    
    # Also check if hips are very low (close to ankles)
    ankle_y = (landmarks[15, 1] + landmarks[16, 1]) / 2
    hip_near_ground = curr_hip[1] > ankle_y - 0.1
    
    fall_detected = velocity_y > velocity_threshold or hip_near_ground
    
    return {
        'fall_detected': fall_detected,
        'message': "🚨 Are you okay? Notifying trainer in 10s..." if fall_detected else None
    }


def generate_feedback(landmarks: np.ndarray, 
                      ideal_landmarks: np.ndarray,
                      angle_rules: Optional[Dict] = None) -> List[str]:
    """
    Generate human-readable feedback for pose correction.
    
    Args:
        landmarks: Current user landmarks
        ideal_landmarks: Reference pose landmarks
        angle_rules: Optional dict with ideal angles and tolerances
    
    Returns:
        List of feedback strings
    """
    feedback = []
    
    # Calculate current angles
    current_angles = calculate_body_angles(landmarks)
    ideal_angles = calculate_body_angles(ideal_landmarks) if ideal_landmarks is not None else {}
    
    # Compare angles
    angle_names = {
        'left_elbow': 'left elbow',
        'right_elbow': 'right elbow',
        'left_shoulder': 'left shoulder',
        'right_shoulder': 'right shoulder',
        'left_hip': 'left hip',
        'right_hip': 'right hip',
        'left_knee': 'left knee',
        'right_knee': 'right knee'
    }
    
    deviations = []
    for angle_name, current in current_angles.items():
        if angle_name in ideal_angles:
            ideal = ideal_angles[angle_name]
            deviation = abs(current - ideal)
            if deviation > 15:  # Threshold
                deviations.append((angle_name, deviation, current < ideal))
    
    # Sort by deviation (worst first)
    deviations.sort(key=lambda x: x[1], reverse=True)
    
    # Generate feedback for top 3
    for angle_name, deviation, is_under in deviations[:3]:
        body_part = angle_names.get(angle_name, angle_name)
        
        if 'knee' in angle_name or 'elbow' in angle_name:
            action = "Bend" if is_under else "Straighten"
        else:
            action = "Lower" if is_under else "Raise"
        
        feedback.append(f"{action} your {body_part}")
    
    if not feedback:
        feedback.append("Great form! Hold the pose.")
    
    return feedback


# ==================== DNN CLASSIFIER ====================

def build_pose_classifier(num_classes: int, 
                          embedding_dim: int = 67) -> keras.Model:
    """
    Build a custom DNN for pose classification.
    
    Architecture:
    - Input: Normalized landmark embedding (65 values for MoveNet)
    - Dense layers with BatchNorm and Dropout
    - Output: Softmax over pose classes
    
    Args:
        num_classes: Number of yoga poses to classify
        embedding_dim: Input dimension (65 for MoveNet vs 115 for MediaPipe)
    
    Returns:
        Compiled Keras model
    """
    model = keras.Sequential([
        layers.Input(shape=(embedding_dim,)),
        
        # First hidden layer
        layers.Dense(256, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        
        # Second hidden layer
        layers.Dense(128, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        
        # Third hidden layer
        layers.Dense(64, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.2),
        
        # Output layer
        layers.Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


class PoseClassifier:
    """
    Wrapper for the pose classification model.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.model: Optional[keras.Model] = None
        self.class_names: List[str] = []
        
        if model_path:
            self.load(model_path)
    
    def load(self, model_path: str):
        """Load a trained model."""
        self.model = keras.models.load_model(model_path)
        # Load class names from companion file
        import json
        import os
        meta_path = model_path.replace('.h5', '_meta.json')
        if os.path.exists(meta_path):
            with open(meta_path, 'r') as f:
                meta = json.load(f)
                self.class_names = meta.get('class_names', [])
    
    def predict(self, embedding: np.ndarray) -> Tuple[str, float]:
        """
        Predict pose class from embedding.
        
        Returns:
            (class_name, confidence)
        """
        if self.model is None:
            return ("unknown", 0.0)
        
        # Ensure correct shape
        if embedding.ndim == 1:
            embedding = embedding.reshape(1, -1)
        
        predictions = self.model.predict(embedding, verbose=0)
        class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][class_idx])
        
        class_name = self.class_names[class_idx] if class_idx < len(self.class_names) else f"class_{class_idx}"
        
        return (class_name, confidence)


# ==================== GLOBAL INSTANCES ====================

# Singleton extractor for efficiency
_extractor: Optional[MoveNetExtractor] = None

def get_extractor(model_type: str = "lightning") -> MoveNetExtractor:
    """Get or create the MoveNet extractor singleton."""
    global _extractor
    if _extractor is None:
        _extractor = MoveNetExtractor(model_type=model_type)
    return _extractor


def cleanup():
    """Clean up resources."""
    global _extractor
    if _extractor:
        _extractor.close()
        _extractor = None
