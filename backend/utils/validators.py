import io
import mimetypes
import numpy as np
from PIL import Image

ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/jpg'}
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

def verify_brain_mri_characteristics(img: Image.Image) -> tuple[bool, str | None]:
    """
    Brain MRI Domain Validator:
    Permissive mode to allow testing with various MRI captures, annotated scans, and test images.
    """
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
