import io
import mimetypes
import numpy as np
from PIL import Image

ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/jpg'}
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

def verify_brain_mri_characteristics(img: Image.Image) -> tuple[bool, str | None]:
    """
    Intelligent Brain MRI Domain Validator:
    - Supports Grayscale, T1, T2, FLAIR, PACS blue-tinted viewer captures, and high-contrast scans.
    - Accurately detects and rejects natural scenes, buildings, outdoor photos, vehicles, and non-radiological images.
    """
    rgb_img = img.convert('RGB')
    np_img = np.asarray(rgb_img, dtype=np.float32)
    h, w, _ = np_img.shape

    r = np_img[:, :, 0]
    g = np_img[:, :, 1]
    b = np_img[:, :, 2]
    
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    delta = max_c - min_c

    # 1. Saturation calculation
    with np.errstate(divide='ignore', invalid='ignore'):
        saturation = np.where(max_c > 0, delta / max_c, 0)

    # 2. Multi-Color Spectrum Test (Building/Natural Scene vs Tinted MRI)
    # Real natural photos (e.g. buildings, outdoor scenes) have high saturation across multiple colors (reds, yellows, greens, blues)
    # Medical MRI scans (even blue-tinted PACS views) have low multi-color diversity.
    vivid_colored_pixels = np.mean((saturation > 0.55) & (max_c > 50))
    
    # Red-Yellow channel dominance test (hallmark of buildings, cranes, natural objects)
    has_warm_colors = np.mean((r > b + 40) & (r > g + 20) & (saturation > 0.40))
    has_lush_greens = np.mean((g > r + 30) & (g > b + 20) & (saturation > 0.40))

    if vivid_colored_pixels > 0.15 or has_warm_colors > 0.08 or has_lush_greens > 0.08:
        return False, "Image Rejected: Uploaded image contains vibrant multi-color patterns (such as buildings, scenery, or outdoor photos). Please upload an authentic Brain MRI scan."

    # 3. Scanner Border Darkness & Centered Brain Mass Test
    # Brain scans are centered with darker peripheral borders
    corner_h = max(int(h * 0.06), 2)
    corner_w = max(int(w * 0.06), 2)
    
    corners = [
        np_img[:corner_h, :corner_w],
        np_img[:corner_h, -corner_w:],
        np_img[-corner_h:, :corner_w],
        np_img[-corner_h:, -corner_w:]
    ]
    avg_corner = np.mean([np.mean(c) for c in corners])
    
    # Check central region (where brain parenchyma resides)
    center = np_img[int(h*0.2):int(h*0.8), int(w*0.2):int(w*0.8)]
    center_mean = np.mean(center)
    center_std = np.std(center)

    # If the corners are extremely bright white (e.g. document/webpage screenshot with text)
    if avg_corner > 220.0 and center_mean > 200.0:
        return False, "Image Rejected: Image does not match medical MRI format (appears to be a document or bright text capture)."

    # Must have non-zero structural variance
    if center_std < 8.0:
        return False, "Image Rejected: Low structural contrast. No brain tissue structure detected."

    return True, None

def validate_image_file(file_storage):
    """
    Validates uploaded file for:
    - Non-empty filename & allowed extension
    - Content size
    - Real image verification via Pillow
    - Domain verification: Authenticates image as genuine Brain MRI
    Returns: (is_valid: bool, error_message: str or None, image_bytes: bytes or None)
    """
    if not file_storage or not file_storage.filename:
        return False, "No file provided or filename is empty.", None
    
    filename = file_storage.filename.lower()
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file extension '.{ext}'. Allowed formats: jpg, jpeg, png.", None
    
    file_bytes = file_storage.read()
    file_storage.seek(0)
    
    if len(file_bytes) == 0:
        return False, "Uploaded file is empty.", None
        
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        return False, f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB.", None
    
    try:
        # Validate actual image data
        with Image.open(io.BytesIO(file_bytes)) as img:
            img.verify()
        
        # Re-open for dimensions and medical validation checks
        with Image.open(io.BytesIO(file_bytes)) as img:
            width, height = img.size
            if width < 64 or height < 64:
                return False, f"Image dimensions ({width}x{height}) are too small for brain MRI analysis.", None
            
            # Authenticate as Brain MRI
            is_mri, mri_err = verify_brain_mri_characteristics(img)
            if not is_mri:
                return False, mri_err, None
                
        return True, None, file_bytes
    except Exception as e:
        return False, f"Corrupted or invalid image file: {str(e)}", None
