"""
Training Script for Asana-Bridge with MoveNet
Admin-only route for training custom pose classifier
Uses PIL (NO OpenCV) + MoveNet for landmark extraction
"""

import os
import json
import numpy as np
from PIL import Image
from typing import List, Tuple, Dict
from pathlib import Path
import tensorflow as tf
from tensorflow import keras

from ml_engine_movenet import (
    MoveNetExtractor,
    MediaPipePoseExtractor,
    compute_pose_embedding, 
    build_pose_classifier
)
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading


# Thread-local storage for extractors to ensure thread-safety
thread_local = threading.local()

def get_thread_extractor(extractor_type: str):
    """
    Get or create an extractor instance for the current thread.
    """
    if not hasattr(thread_local, "extractor"):
        if extractor_type.lower() == "mediapipe":
            thread_local.extractor = MediaPipePoseExtractor()
        else:
            thread_local.extractor = MoveNetExtractor(model_type="lightning")
    return thread_local.extractor

def load_dataset_from_folder(dataset_path: str, extractor_type: str = "mediapipe") -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Load yoga pose dataset using multi-threaded extraction.
    """
    print(f"📂 Loading dataset from: {dataset_path}")
    print(f"⚡ Extractor: {extractor_type}")
    
    dataset_root = Path(dataset_path)
    if not dataset_root.exists():
        raise ValueError(f"Dataset path does not exist: {dataset_path}")
    
    # Lists to store results
    all_embeddings = []
    all_labels = []
    class_names = []
    
    # Lock for thread-safe list appending
    results_lock = threading.Lock()
    
    # Iterate through pose folders
    pose_folders = sorted([d for d in dataset_root.iterdir() if d.is_dir()])
    
    def process_image(img_path, class_idx, pose_name):
        try:
            # Get thread-local extractor
            extractor = get_thread_extractor(extractor_type)
            
            # Load image with PIL
            image = Image.open(img_path).convert('RGB')
            
            # Extract landmarks (Thread-safe via thread-local)
            landmarks = extractor.extract_from_pil(image)
            
            if landmarks is None:
                return None
            
            # Compute embedding
            embedding = compute_pose_embedding(landmarks)
            
            return (embedding, class_idx)
            
        except Exception:
            return None

    for class_idx, pose_folder in enumerate(pose_folders):
        pose_name = pose_folder.name
        class_names.append(pose_name)
        
        print(f"📸 Processing class {class_idx}: {pose_name} (Multi-threaded)")
        
        # Get all images in folder (use set to avoid duplicates on case-insensitive systems)
        image_files_set = set()
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
            image_files_set.update(list(pose_folder.glob(ext)))
        image_files = sorted(list(image_files_set))
        
        total_images = len(image_files)
        valid_count = 0
        
        # Use ThreadPoolExecutor for concurrent extraction
        # We use a limited number of workers to avoid overwhelming the CPU
        # 8 workers is a good middle ground for modern CPUs
        with ThreadPoolExecutor(max_workers=8) as executor_pool:
            futures = [executor_pool.submit(process_image, img, class_idx, pose_name) for img in image_files]
            
            for i, future in enumerate(as_completed(futures)):
                result = future.result()
                if result:
                    emb, idx = result
                    with results_lock:
                        all_embeddings.append(emb)
                        all_labels.append(idx)
                    valid_count += 1
                
                # Feedback every 100 images
                if (i + 1) % 100 == 0:
                    print(f"  Processed {i+1}/{total_images} images...")
        
        print(f"  ✅ Loaded {valid_count}/{total_images} valid samples for {pose_name}")
    
    if len(all_embeddings) == 0:
        raise ValueError("No valid samples found in dataset!")
    
    X = np.array(all_embeddings, dtype=np.float32)
    y = np.array(all_labels, dtype=np.int32)
    
    print(f"\n📊 Dataset Summary:")
    print(f"  Total samples: {len(X)}")
    print(f"  Classes: {len(class_names)}")
    print(f"  Embedding shape: {X.shape}")
    
    return X, y, class_names


def train_model(X: np.ndarray, 
                y: np.ndarray, 
                class_names: List[str],
                epochs: int = 100,
                batch_size: int = 32,
                validation_split: float = 0.2) -> Tuple[keras.Model, Dict]:
    """
    Train the pose classifier.
    
    Args:
        X: (N, 65) embeddings
        y: (N,) labels
        class_names: List of class names
        epochs: Training epochs
        batch_size: Batch size
        validation_split: Validation split ratio
    
    Returns:
        model: Trained Keras model
        history: Training history dict
    """
    print(f"\n🏋️ Training pose classifier...")
    print(f"  Samples: {len(X)}")
    print(f"  Classes: {len(class_names)}")
    print(f"  Epochs: {epochs}")
    print(f"  Batch size: {batch_size}")
    
    # Build model - auto-detect num_classes and embedding_dim from data
    num_classes = len(class_names)
    embedding_dim = X.shape[1]  # auto-detect (67 for MoveNet)
    model = build_pose_classifier(num_classes, embedding_dim=embedding_dim)
    
    # Print model summary
    model.summary()
    
    # Add callbacks
    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1
        )
    ]
    
    # Train
    history = model.fit(
        X, y,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=validation_split,
        callbacks=callbacks,
        verbose=1
    )
    
    # Get final metrics
    final_train_acc = history.history['accuracy'][-1]
    final_val_acc = history.history['val_accuracy'][-1]
    
    print(f"\n✅ Training complete!")
    print(f"  Final train accuracy: {final_train_acc:.2%}")
    print(f"  Final val accuracy: {final_val_acc:.2%}")
    
    return model, history.history


def save_model(model: keras.Model, 
               output_path: str,
               class_names: List[str],
               history: Dict):
    """
    Save the trained model and metadata.
    
    Args:
        model: Trained Keras model
        output_path: Path to save .h5 file
        class_names: List of class names
        history: Training history
    """
    # Save model
    model.save(output_path)
    print(f"💾 Model saved to: {output_path}")
    
    # Save metadata
    meta_path = output_path.replace('.h5', '_meta.json')
    metadata = {
        'class_names': class_names,
        'num_classes': len(class_names),
        'embedding_dim': 67,
        'model_type': 'movenet_lightning',
        'final_train_accuracy': float(history['accuracy'][-1]),
        'final_val_accuracy': float(history['val_accuracy'][-1]),
        'epochs_trained': len(history['accuracy'])
    }
    
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"📝 Metadata saved to: {meta_path}")


def generate_reference_embeddings(dataset_path: str, output_dir: str = "./reference_embeddings", extractor_type: str = "mediapipe"):
    """
    Generate reference embeddings for each pose class.
    """
    print(f"\n🎯 Generating reference embeddings...")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Load dataset
    X, y, class_names = load_dataset_from_folder(dataset_path, extractor_type=extractor_type)
    
    # Generate one embedding per class (average)
    for class_idx, pose_name in enumerate(class_names):
        # Get all samples for this class
        class_mask = (y == class_idx)
        class_embeddings = X[class_mask]
        
        # Average embedding
        avg_embedding = np.mean(class_embeddings, axis=0)
        
        # Save as JSON
        output_file = os.path.join(output_dir, f"{pose_name}.json")
        data = {
            'pose_name': pose_name,
            'num_samples': int(np.sum(class_mask)),
            'embeddings': [
                {
                    'embedding': avg_embedding.tolist(),
                    'type': 'average'
                }
            ]
        }
        
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"  ✅ {pose_name}: {output_file}")
    
    print(f"🎉 Reference embeddings saved to: {output_dir}")


# ==================== EXAMPLE USAGE ====================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train Asana-Bridge pose classifier")
    parser.add_argument("--dataset", type=str, required=True, help="Path to dataset folder")
    parser.add_argument("--output", type=str, default="./models/pose_classifier.h5", help="Output model path")
    parser.add_argument("--epochs", type=int, default=100, help="Training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--generate-refs", action="store_true", help="Generate reference embeddings")
    parser.add_argument("--extractor", type=str, default="mediapipe", choices=["movenet", "mediapipe"], help="Extractor type")
    
    args = parser.parse_args()
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    # Load dataset
    X, y, class_names = load_dataset_from_folder(args.dataset, extractor_type=args.extractor)
    
    # Train model
    model, history = train_model(X, y, class_names, epochs=args.epochs, batch_size=args.batch_size)
    
    # Save model
    save_model(model, args.output, class_names, history)
    
    # Generate reference embeddings if requested
    if args.generate_refs:
        generate_reference_embeddings(args.dataset, extractor_type=args.extractor)
    
    print("\n🎉 All done!")
