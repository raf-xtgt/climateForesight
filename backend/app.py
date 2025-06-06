from flask import Flask, request, jsonify
import requests
from dotenv import load_dotenv
import os
from flask_cors import CORS
# from api.controller.climate_controller import climate_control_bp
# from api.controller.climate_controller_v2 import climate_control_bp_v2
from api.controller.v3 import bp_v3

app = Flask(__name__)
CORS(app, resources={
    r"/*": {  # This will apply to all routes
        "origins": "http://localhost:3000",
        "supports_credentials": True
    }
})

# app.register_blueprint(climate_control_bp, url_prefix='/api')
app.register_blueprint(bp_v3, url_prefix='/api')


@app.route('/test', methods=['POST'])
def test():
    print("Test received:", request.json)
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)