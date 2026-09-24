from flask import Blueprint, request, jsonify
from utils.security import require_auth
from config import Config
from supabase import create_client

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/verify', methods=['GET'])
@require_auth
def verify_session():
    """
    Verifies valid authenticated session token.
    """
    return jsonify({
        "success": True,
        "user_id": request.user_id,
        "email": request.user_payload.get('email', '')
    }), 200
