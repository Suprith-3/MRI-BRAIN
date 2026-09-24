from flask import Blueprint, request, jsonify
from utils.security import require_auth
from config import Config
from supabase import create_client
from utils.logger import logger

history_bp = Blueprint('history', __name__)

# In-memory mock store for history when database is not connected
MOCK_HISTORY = {}

@history_bp.route('', methods=['GET'])
@require_auth
def get_user_history():
    """
    Retrieves all past brain MRI analysis records for the authenticated user.
    """
    user_id = request.user_id
    
    if Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY:
        try:
            supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
            response = supabase.table('analysis_records')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .execute()
            return jsonify({"success": True, "records": response.data}), 200
        except Exception as e:
            logger.error(f"Failed to query Supabase history: {e}")
            
    # Fallback to local memory history
    user_records = MOCK_HISTORY.get(user_id, [])
    return jsonify({"success": True, "records": user_records}), 200

@history_bp.route('/<analysis_id>', methods=['DELETE'])
@require_auth
def delete_record(analysis_id):
    """
    Deletes a specific analysis record belonging to the authenticated user.
    """
    user_id = request.user_id
    
    if Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY:
        try:
            supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
            supabase.table('analysis_records')\
                .delete()\
                .eq('id', analysis_id)\
                .eq('user_id', user_id)\
                .execute()
            return jsonify({"success": True, "message": "Record deleted"}), 200
        except Exception as e:
            logger.error(f"Failed to delete record: {e}")
            
    if user_id in MOCK_HISTORY:
        MOCK_HISTORY[user_id] = [r for r in MOCK_HISTORY[user_id] if r.get('id') != analysis_id]
        
    return jsonify({"success": True, "message": "Record deleted"}), 200
