
import os
import json
import numpy as np
import tensorflow as tf
from tensorflow import keras

def verify_deployment():
    print("🔍 Starting Automated Verification...")
    
    # 1. Verify Model File
    model_path = "./models/pose_classifier.h5"
    if not os.path.exists(model_path):
        print("❌ Model file missing: ./models/pose_classifier.h5")
        return False
    print("✅ Model file exists")

    # 2. Verify Metadata
    meta_path = "./models/pose_classifier_meta.json"
    if not os.path.exists(meta_path):
        print("❌ Metadata file missing")
        return False
        
    with open(meta_path, 'r') as f:
        meta = json.load(f)
        
    if meta.get('embedding_dim') != 67:
        print(f"❌ Incorrect embedding dimension in metadata: {meta.get('embedding_dim')} (Expected 67)")
        return False
    print(f"✅ Metadata verified: {meta.get('num_classes')} classes, 67 dims")

    # 3. Load Model
    try:
        model = keras.models.load_model(model_path)
        input_shape = model.input_shape
        if input_shape[1] != 67:
             print(f"❌ Model input shape mismatch: {input_shape[1]} (Expected 67)")
             return False
        print("✅ Model loaded successfully with correct input shape")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return False

    # 4. Verify Reference Embeddings
    ref_dir = "./reference_embeddings"
    expected_classes = meta.get('class_names', [])
    missing_refs = []
    
    for cls in expected_classes:
        ref_path = os.path.join(ref_dir, f"{cls}.json")
        if not os.path.exists(ref_path):
            missing_refs.append(cls)
            
    if missing_refs:
        print(f"❌ Missing reference embeddings for: {', '.join(missing_refs)}")
        return False
    print(f"✅ All {len(expected_classes)} reference embeddings found")

    print("\n🎉 VERIFICATION SUCCESSFUL! System is ready.")
    return True

if __name__ == "__main__":
    verify_deployment()
