import os
import shutil
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from config import Config
from routes.prediction import prediction_bp
from routes.auth import auth_bp
from routes.reports import reports_bp
from routes.history import history_bp
from routes.profile import profile_bp
from utils.logger import logger

def copy_media_assets():
    """Ensure BACKGROUND VIDO.mp4 and custom logo are copied to frontend/public"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
        target_dir = os.path.abspath(os.path.join(current_dir, "..", "frontend", "public"))
        os.makedirs(target_dir, exist_ok=True)

        # 1. Video copying
        possible_sources = [
            os.path.join(workspace_root, "BACKGROUND VIDO.mp4"),
            os.path.join(current_dir, "..", "BACKGROUND VIDO.mp4"),
            r"c:\Users\supre\vinay b\BACKGROUND VIDO.mp4"
        ]
        target_file = os.path.join(target_dir, "background.mp4")
        for src in possible_sources:
            if os.path.exists(src):
                shutil.copy2(src, target_file)
                break

        # 2. Logo copying
        logo_sources = [
            r"c:\Users\supre\vinay b\logo.png",
            os.path.join(workspace_root, "logo.png"),
            os.path.join(current_dir, "..", "logo.png"),
            r"C:\Users\supre\.gemini\antigravity-ide\brain\ccaf8f92-022a-49c1-bce8-574bcdea873c\.user_uploaded\media_1790254089201.jpg",
        ]
        target_logo = os.path.join(target_dir, "logo.png")
        sub_logo = os.path.abspath(os.path.join(current_dir, "..", "logo.png"))
        for lsrc in logo_sources:
            if os.path.exists(lsrc) and os.path.abspath(lsrc) != os.path.abspath(target_logo):
                shutil.copy2(lsrc, target_logo)
                if os.path.abspath(lsrc) != os.path.abspath(sub_logo):
                    shutil.copy2(lsrc, sub_logo)
                logger.info(f"Custom Logo copied from {lsrc} to {target_logo}")
                break

    except Exception as e:
        logger.warning(f"Could not automatically copy media assets: {e}")

def create_app(config_class=Config):
    copy_media_assets()
    
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(prediction_bp, url_prefix='/api/prediction')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(history_bp, url_prefix='/api/history')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy", "service": "NeuroScan AI Backend"}), 200

    @app.route('/api/logo', methods=['GET'])
    def serve_logo():
        current_dir = os.path.dirname(os.path.abspath(__file__))
        target_file = os.path.abspath(os.path.join(current_dir, "..", "frontend", "public", "logo.png"))
        if os.path.exists(target_file):
            return send_file(target_file, mimetype='image/png')
        return jsonify({"error": "Logo not found"}), 404

    @app.route('/api/video/background', methods=['GET'])
    def serve_background_video():
        current_dir = os.path.dirname(os.path.abspath(__file__))
        target_file = os.path.abspath(os.path.join(current_dir, "..", "frontend", "public", "background.mp4"))
        if not os.path.exists(target_file):
            video_src = r"c:\Users\supre\vinay b\BACKGROUND VIDO.mp4"
            if os.path.exists(video_src):
                return send_file(video_src, mimetype='video/mp4')
            return jsonify({"error": "Video not found"}), 404
        return send_file(target_file, mimetype='video/mp4')

    # Error handling
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad request"}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(error):
        return jsonify({"error": "Internal server error"}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
