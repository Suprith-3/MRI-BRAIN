import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'default-secret-key-change-in-production')
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET')
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
    MODEL_PATH = os.environ.get('MODEL_PATH', 'models/brain_tumor_model/model.pt')
    
    # Optional constraints
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024 # 16 MB max upload
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
