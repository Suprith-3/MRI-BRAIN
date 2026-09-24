import io
import numpy as np
from PIL import Image

class ImagePreprocessor:
    """
    Dedicated image preprocessing pipeline matching model training requirements.
    Supports configurable dimensions, color space, and normalization.
    """
    def __init__(self, target_size=(224, 224), normalize_mean=(0.485, 0.456, 0.406), normalize_std=(0.229, 0.224, 0.225)):
        self.target_size = target_size
        self.normalize_mean = np.array(normalize_mean, dtype=np.float32)
        self.normalize_std = np.array(normalize_std, dtype=np.float32)
        self.version = "1.0.0"

    def process(self, image_bytes: bytes) -> np.ndarray:
        """
        Converts raw bytes -> RGB PIL -> Resized -> Normalized numpy array (1, C, H, W).
        """
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize(self.target_size, Image.Resampling.BILINEAR)
        
        # Convert to numpy array (H, W, C) in range [0, 1]
        img_arr = np.asarray(image, dtype=np.float32) / 255.0
        
        # Normalize with standard ImageNet or customized stats
        img_arr = (img_arr - self.normalize_mean) / self.normalize_std
        
        # Transpose to (C, H, W) and expand batch dimension (1, C, H, W)
        tensor_arr = np.transpose(img_arr, (2, 0, 1))
        tensor_arr = np.expand_dims(tensor_arr, axis=0)
        
        return tensor_arr
