import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from utils.security import require_auth
from utils.validators import validate_image_file
from utils.logger import logger
from services.ml_service import MLService
from services.groq_service import GroqService
from services.report_service import ReportService
from services.storage_service import StorageService
from routes.history import MOCK_HISTORY
from config import Config
from supabase import create_client

prediction_bp = Blueprint('prediction', __name__)

ml_service = MLService(Config.MODEL_PATH)
groq_service = GroqService()
report_service = ReportService()
storage_service = StorageService()

@prediction_bp.route('/analyze', methods=['POST'])
@require_auth
def analyze_mri():
    """
    Core Pipeline:
    1. Authenticate user via verified JWT (request.user_id)
    2. Validate file type, MIME type, dimensions, corruption
    3. Generate unique analysis ID
    4. Store raw image securely
    5. Preprocess image & run ML model inference
    6. Generate structured educational explanation via Groq
    7. Generate downloadable PDF report with ReportLab
    8. Persist analysis record
    9. Return result payload
    """
    user_id = request.user_id
    
    if 'image' not in request.files:
        return jsonify({"success": False, "error": "No image file provided in request."}), 400
        
    file = request.files['image']
    is_valid, err_msg, image_bytes = validate_image_file(file)
    if not is_valid:
        return jsonify({"success": False, "error": err_msg}), 400

    analysis_id = str(uuid.uuid4())
    filename = file.filename or "mri_scan.jpg"
    
    try:
        # Step 1: Secure upload
        storage_path = storage_service.upload_scan(user_id, analysis_id, image_bytes, filename)
        
        # Step 2: ML Inference
        prediction_result = ml_service.predict(image_bytes)
        
        # Step 3: Groq Educational Explanation
        explanation = groq_service.generate_explanation(prediction_result)
        
        # Step 4: Generate ReportLab PDF
        user_data = {
            "first_name": request.user_payload.get('first_name', 'Research'),
            "last_name": request.user_payload.get('last_name', 'User'),
            "email": request.user_payload.get('email', 'user@neuroscan.ai')
        }
        
        analysis_record = {
            "id": analysis_id,
            "user_id": user_id,
            "image_path": storage_path,
            "image_filename": filename,
            "prediction": prediction_result["predicted_class"],
            "confidence": prediction_result["confidence"],
            "probabilities": prediction_result["probabilities"],
            "glioma_probability": prediction_result["probabilities"]["Glioma"],
            "meningioma_probability": prediction_result["probabilities"]["Meningioma"],
            "pituitary_probability": prediction_result["probabilities"]["Pituitary"],
            "none_probability": prediction_result["probabilities"]["None"],
            "model_name": prediction_result["model_name"],
            "model_version": prediction_result["model_version"],
            "preprocessing_version": prediction_result["preprocessing_version"],
            "analysis_status": "completed",
            "created_at": datetime.utcnow().isoformat(),
            "explanation": explanation
        }
        
        pdf_path = report_service.generate_pdf(analysis_record, user_data, image_bytes)
        storage_service.upload_report(user_id, analysis_id, pdf_path)
        
        # Step 5: Save record to Supabase or Memory Store
        if Config.SUPABASE_URL and Config.SUPABASE_SERVICE_ROLE_KEY:
            try:
                supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
                supabase.table('analysis_records').insert({
                    "id": analysis_id,
                    "user_id": user_id,
                    "image_path": storage_path,
                    "image_filename": filename,
                    "prediction": prediction_result["predicted_class"],
                    "confidence": prediction_result["confidence"],
                    "glioma_probability": prediction_result["probabilities"]["Glioma"],
                    "meningioma_probability": prediction_result["probabilities"]["Meningioma"],
                    "pituitary_probability": prediction_result["probabilities"]["Pituitary"],
                    "none_probability": prediction_result["probabilities"]["None"],
                    "model_name": prediction_result["model_name"],
                    "model_version": prediction_result["model_version"],
                    "preprocessing_version": prediction_result["preprocessing_version"],
                    "analysis_status": "completed"
                }).execute()
            except Exception as e:
                logger.error(f"Failed to write record to Supabase: {e}")

        # Always maintain in memory store for local testing
        if user_id not in MOCK_HISTORY:
            MOCK_HISTORY[user_id] = []
        MOCK_HISTORY[user_id].insert(0, analysis_record)
        
        return jsonify({
            "success": True,
            "analysis_id": analysis_id,
            "prediction": {
                "class": prediction_result["predicted_class"],
                "confidence": prediction_result["confidence"],
                "probabilities": prediction_result["probabilities"]
            },
            "explanation": explanation,
            "report": {
                "available": True,
                "download_url": f"/api/reports/{analysis_id}"
            }
        }), 200

    except Exception as e:
        logger.error(f"Inference/Analysis pipeline failed: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Image analysis encountered an internal error. Please check image format and try again."
        }), 500
