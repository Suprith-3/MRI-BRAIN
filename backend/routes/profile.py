from flask import Blueprint, request, jsonify
from utils.security import require_auth
from config import Config
from supabase import create_client
from utils.logger import logger

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('', methods=['GET'])
@require_auth
def get_profile():
    """
    Retrieves the user's profile information.
    """
    user_id = request.user_id
    email = request.user_payload.get('email', 'user@example.com')
    
    if Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY:
        try:
            supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
            response = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
            if response.data:
                return jsonify({"success": True, "profile": response.data}), 200
        except Exception as e:
            logger.warning(f"Profile query error: {e}")

    # Fallback/Default profile
    return jsonify({
        "success": True,
        "profile": {
            "id": user_id,
            "first_name": "Medical",
            "last_name": "Researcher",
            "email": email,
            "created_at": "2026-09-24T00:00:00Z"
        }
    }), 200

@profile_bp.route('', methods=['PUT'])
@require_auth
def update_profile():
    """
    Updates the user's profile information.
    """
    user_id = request.user_id
    data = request.get_json() or {}
    first_name = data.get('first_name', '')
    last_name = data.get('last_name', '')
    
    if Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY:
        try:
            supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
            supabase.table('profiles').upsert({
                "id": user_id,
                "first_name": first_name,
                "last_name": last_name,
                "updated_at": "now()"
            }).execute()
        except Exception as e:
            logger.error(f"Failed to update profile: {e}")
            return jsonify({"success": False, "error": "Database update failed"}), 500
            
    return jsonify({"success": True, "message": "Profile updated successfully"}), 200
