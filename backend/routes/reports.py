import os
from flask import Blueprint, request, jsonify, send_file
from utils.security import require_auth
from services.report_service import ReportService
from utils.logger import logger

reports_bp = Blueprint('reports', __name__)
report_service = ReportService()

@reports_bp.route('/<analysis_id>', methods=['GET'])
def download_report(analysis_id):
    """
    Returns the generated PDF report for a given analysis ID.
    Supports direct browser downloads and attachment streams.
    """
    # Look for local report file
    filepath = os.path.join(report_service.output_dir, f"report_{analysis_id}.pdf")
    
    if os.path.exists(filepath):
        return send_file(
            filepath,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"NeuroScan_Report_{analysis_id[:8]}.pdf"
        )
    
    return jsonify({"success": False, "error": "Report not found or not yet generated."}), 404
