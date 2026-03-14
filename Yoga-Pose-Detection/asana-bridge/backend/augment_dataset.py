"""
Data Augmentation Script for Asana-Bridge Yoga Dataset
Generates 9 augmented images per original → 10x dataset size
Also supports adding a 'not_yoga' negative class

Usage:
    python augment_dataset.py --input ../../yoga_dataset_6poses --output ../../yoga_dataset_6poses_augmented
    python augment_dataset.py --input ../../yoga_dataset_6poses --output ../../yoga_dataset_6poses_augmented --add-negative
"""

import os
import cv2
import numpy as np
import argparse
import random
import shutil
from pathlib import Path
from typing import List, Tuple


# ==================== AUGMENTATION FUNCTIONS ====================

def augment_flip(img: np.ndarray) -> np.ndarray:
    """Horizontal mirror (yoga poses are usually symmetric)"""
    return cv2.flip(img, 1)

def augment_brightness_up(img: np.ndarray) -> np.ndarray:
    """Increase brightness by ~40%"""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 2] = np.clip(hsv[:, :, 2] * 1.4, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

def augment_brightness_down(img: np.ndarray) -> np.ndarray:
    """Decrease brightness by ~30%"""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 2] = np.clip(hsv[:, :, 2] * 0.7, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

def augment_rotate_cw(img: np.ndarray) -> np.ndarray:
    """Rotate clockwise 15 degrees"""
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), -15, 1.0)
    return cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT)

def augment_rotate_ccw(img: np.ndarray) -> np.ndarray:
    """Rotate counter-clockwise 15 degrees"""
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), 15, 1.0)
    return cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT)

def augment_zoom_in(img: np.ndarray) -> np.ndarray:
    """Zoom into center by 20% (simulates closer camera)"""
    h, w = img.shape[:2]
    factor = 0.2
    x1 = int(w * factor / 2)
    y1 = int(h * factor / 2)
    x2 = w - x1
    y2 = h - y1
    cropped = img[y1:y2, x1:x2]
    return cv2.resize(cropped, (w, h), interpolation=cv2.INTER_LINEAR)

def augment_blur(img: np.ndarray) -> np.ndarray:
    """Gaussian blur (simulates motion / low quality camera)"""
    return cv2.GaussianBlur(img, (5, 5), 0)

def augment_noise(img: np.ndarray) -> np.ndarray:
    """Add Gaussian noise (simulates poor lighting / compression)"""
    noise = np.random.normal(0, 15, img.shape).astype(np.float32)
    noisy = np.clip(img.astype(np.float32) + noise, 0, 255)
    return noisy.astype(np.uint8)

def augment_contrast(img: np.ndarray) -> np.ndarray:
    """Apply CLAHE contrast enhancement (simulates different skin tones)"""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

# All augmentation functions: 9 transforms (original + 9 = 10x)
AUGMENTATIONS = [
    ("flip", augment_flip),
    ("bright_up", augment_brightness_up),
    ("bright_down", augment_brightness_down),
    ("rotate_cw", augment_rotate_cw),
    ("rotate_ccw", augment_rotate_ccw),
    ("zoom", augment_zoom_in),
    ("blur", augment_blur),
    ("noise", augment_noise),
    ("contrast", augment_contrast),
]


# ==================== CORE AUGMENTATION LOGIC ====================

def augment_class_folder(
    input_folder: Path,
    output_folder: Path,
    augmentations: list,
    copy_original: bool = True
) -> Tuple[int, int]:
    """
    Augment all images in a class folder.

    Returns:
        (original_count, augmented_count)
    """
    output_folder.mkdir(parents=True, exist_ok=True)

    # Find all images
    image_files = []
    for ext in ["*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG"]:
        image_files.extend(input_folder.glob(ext))

    original_count = len(image_files)
    augmented_count = 0

    for img_path in image_files:
        img = cv2.imread(str(img_path))
        if img is None:
            print(f"  ⚠️ Skipping unreadable: {img_path.name}")
            continue

        # Copy original
        if copy_original:
            dst = output_folder / img_path.name
            shutil.copy2(img_path, dst)
            augmented_count += 1

        # Apply each augmentation
        stem = img_path.stem
        ext = img_path.suffix.lower() or ".jpg"

        for aug_name, aug_fn in augmentations:
            try:
                aug_img = aug_fn(img)
                out_name = f"{stem}_{aug_name}{ext}"
                cv2.imwrite(str(output_folder / out_name), aug_img)
                augmented_count += 1
            except Exception as e:
                print(f"  ⚠️ Augmentation '{aug_name}' failed for {img_path.name}: {e}")

    return original_count, augmented_count


def generate_not_yoga_samples(
    output_folder: Path,
    source_folder: Path = None,
    num_augmentations: int = 9
) -> int:
    """
    Generate 'not_yoga' negative samples.
    If source_folder is given, augment those images.
    Otherwise creates synthetic 'crowd / random motion' placeholder images.

    Returns: count of saved samples
    """
    output_folder.mkdir(parents=True, exist_ok=True)
    saved = 0

    if source_folder and source_folder.exists():
        print(f"  📂 Using images from: {source_folder}")
        orig, aug = augment_class_folder(source_folder, output_folder, AUGMENTATIONS[:num_augmentations])
        print(f"  ✅ not_yoga: {orig} originals → {aug} total")
        return aug
    else:
        # Auto-generate synthetic negatives using random noise patterns
        # These are grayscale random images that represent "no person" / random backgrounds
        print("  🎨 Generating synthetic negative samples (random textures)...")
        sizes = [(480, 640), (720, 480), (640, 480)]
        count = 300  # Generate 300 synthetic negatives
        
        for i in range(count):
            # Random noise image (no human pose detectable)
            h, w = random.choice(sizes)
            # Realistic-looking background: gradient + noise
            base = np.random.randint(60, 200, (h, w, 3), dtype=np.uint8)
            noise = np.random.normal(0, 30, (h, w, 3)).astype(np.int16)
            img = np.clip(base.astype(np.int16) + noise, 0, 255).astype(np.uint8)
            # Add a random blur to look natural
            img = cv2.GaussianBlur(img, (15, 15), 0)
            out_path = output_folder / f"synthetic_{i:04d}.jpg"
            cv2.imwrite(str(out_path), img)
            saved += 1

        print(f"  ✅ Generated {saved} synthetic not_yoga samples")
        return saved


# ==================== MAIN ====================

def main():
    parser = argparse.ArgumentParser(description="10x Yoga Dataset Augmentation")
    parser.add_argument("--input", required=True, help="Path to original dataset folder (yoga_dataset_6poses/)")
    parser.add_argument("--output", required=True, help="Path to save augmented dataset")
    parser.add_argument("--add-negative", action="store_true", 
                        help="Add 'not_yoga' negative class (recommended for accuracy)")
    parser.add_argument("--negative-source", type=str, default=None,
                        help="Optional: Path to folder with your own 'not_yoga' images")
    parser.add_argument("--augmentations", type=int, default=9,
                        help="Number of augmentations per image (default: 9, max: 9)")
    args = parser.parse_args()

    input_root = Path(args.input)
    output_root = Path(args.output)

    if not input_root.exists():
        print(f"❌ Input folder not found: {input_root}")
        return

    output_root.mkdir(parents=True, exist_ok=True)
    num_augs = min(args.augmentations, len(AUGMENTATIONS))
    aug_subset = AUGMENTATIONS[:num_augs]

    print(f"\n🧘 Asana-Bridge Dataset Augmentation")
    print(f"   Input:  {input_root.resolve()}")
    print(f"   Output: {output_root.resolve()}")
    print(f"   Augmentations per image: {num_augs}")
    print(f"   Expected multiplier: {num_augs + 1}x\n")

    total_original = 0
    total_augmented = 0

    # Process each pose class
    pose_folders = sorted([d for d in input_root.iterdir() if d.is_dir()])
    for pose_folder in pose_folders:
        pose_name = pose_folder.name
        out_folder = output_root / pose_name
        print(f"📸 Augmenting: {pose_name}  →  {out_folder}")
        orig, aug = augment_class_folder(pose_folder, out_folder, aug_subset)
        total_original += orig
        total_augmented += aug
        print(f"   {orig} images  →  {aug} total ({aug // orig if orig else 0}x)\n")

    # Add negative 'not_yoga' class
    if args.add_negative:
        print(f"➕ Adding 'not_yoga' negative class...")
        neg_source = Path(args.negative_source) if args.negative_source else None
        neg_out = output_root / "not_yoga"
        neg_count = generate_not_yoga_samples(neg_out, neg_source)
        total_augmented += neg_count
        print()

    print("=" * 50)
    print(f"✅ Augmentation Complete!")
    print(f"   Original images:   {total_original:,}")
    print(f"   Augmented total:   {total_augmented:,}")
    print(f"   Actual multiplier: {total_augmented / max(total_original, 1):.1f}x")
    print(f"\n📁 Saved to: {output_root.resolve()}")
    print(f"\n🚀 Next Step - Retrain the model:")
    print(f"   python training_movenet.py \\")
    print(f"     --dataset {output_root.resolve()} \\")
    print(f"     --output ./models/pose_classifier.h5 \\")
    print(f"     --generate-refs \\")
    print(f"     --epochs 100")


if __name__ == "__main__":
    main()
