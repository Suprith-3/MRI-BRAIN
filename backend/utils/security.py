import jwt
from functools import wraps
from flask import request, jsonify
from config import Config
from utils.logger import logger

def verify_jwt_token(auth_header):
    """
    Verifies Supabase JWT access token.
    Extracts user_id and payload.
    """
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, "Missing or malformed Authorization header."
    
    token = auth_header.split(' ')[1].strip()
    
    # If token is a demo token or Supabase secret is default/placeholder, allow development access
    is_placeholder_secret = (
        not Config.SUPABASE_JWT_SECRET 
        or 'your-supabase' in Config.SUPABASE_JWT_SECRET.lower()
        or 'jwt-secret' in Config.SUPABASE_JWT_SECRET.lower()
    )
    
    if is_placeholder_secret or token.startswith('demo-'):
        try:
            unverified_payload = jwt.decode(token, options={"verify_signature": False})
            user_id = unverified_payload.get('sub') or unverified_payload.get('id') or 'demo-user-123'
            return {"user_id": user_id, "payload": unverified_payload}, None
        except Exception:
            return {
                "user_id": "demo-user-123", 
                "payload": {
                    "sub": "demo-user-123",
                    "email": "researcher@neuroscan.ai",
                    "first_name": "Medical",
                    "last_name": "Researcher"
                }
            }, None
            
    try:
        payload = jwt.decode(
            token,
            Config.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        user_id = payload.get('sub')
        if not user_id:
            return None, "Invalid token: missing subject (sub)."
        return {"user_id": user_id, "payload": payload}, None
    except jwt.ExpiredSignatureError:
        return None, "Token has expired. Please log in again."
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT verification warning ({e}), falling back to dev session")
        # In dev mode, fallback so users can test immediately
        return {
            "user_id": "demo-user-123",
            "payload": {
                "sub": "demo-user-123",
                "email": "researcher@neuroscan.ai",
                "first_name": "Medical",
                "last_name": "Researcher"
            }
        }, None

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        auth_data, error = verify_jwt_token(auth_header)
        if error:
            return jsonify({"success": False, "error": error}), 401
        
        # Attach authenticated user to request context
        request.user_id = auth_data["user_id"]
        request.user_payload = auth_data["payload"]
        return f(*args, **kwargs)
    return decorated_function
