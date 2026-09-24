import os
from supabase import create_client, Client
from config import Config
from utils.logger import logger

class StorageService:
    """
    Manages user-isolated private file storage in Supabase Storage or local fallback.
    Path structure: {user_id}/{analysis_id}/filename
    """
    def __init__(self):
        self.supabase: Client = None
        if Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY:
            try:
                self.supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
            except Exception as e:
                logger.warning(f"Failed to initialize Supabase client: {e}")

    def upload_scan(self, user_id: str, analysis_id: str, image_bytes: bytes, filename: str) -> str:
        """
        Uploads brain MRI scan to private 'brain-scans' bucket.
        """
        path = f"{user_id}/{analysis_id}/{filename}"
        if self.supabase:
            try:
                self.supabase.storage.from_("brain-scans").upload(
                    path=path,
                    file=image_bytes,
                    file_options={"content-type": "image/jpeg", "upsert": "true"}
                )
                return path
            except Exception as e:
                logger.error(f"Supabase scan upload failed: {e}")
        
        # Local fallback directory
        local_path = os.path.join("uploads", user_id, analysis_id)
        os.makedirs(local_path, exist_ok=True)
        full_filepath = os.path.join(local_path, filename)
        with open(full_filepath, "wb") as f:
            f.write(image_bytes)
        return full_filepath

    def upload_report(self, user_id: str, analysis_id: str, pdf_path: str) -> str:
        """
        Uploads generated report PDF to private 'reports' bucket.
        """
        storage_path = f"{user_id}/{analysis_id}/report.pdf"
        if self.supabase:
            try:
                with open(pdf_path, 'rb') as f:
                    self.supabase.storage.from_("reports").upload(
                        path=storage_path,
                        file=f,
                        file_options={"content-type": "application/pdf", "upsert": "true"}
                    )
                return storage_path
            except Exception as e:
                logger.error(f"Supabase report upload failed: {e}")
        return pdf_path
