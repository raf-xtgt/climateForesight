from ..services import ClimateDataService
from flask import Flask, Blueprint, jsonify, request
from flask_cors import CORS
import requests
import numpy as np
from datetime import datetime, timedelta
import json
import math


climate_control_bp_v2 = Blueprint('climate_control_bp_v2', __name__)
climate_service = ClimateDataService()


@climate_control_bp_v2.route('/weather/current/<float:lat>/<float:lon>')
def get_current_weather(lat, lon):
    """Get current weather for specific coordinates"""
    data = climate_service.get_weather_data(lat, lon)
    if data:
        return jsonify(data)
    else:
        return jsonify({'error': 'Failed to fetch weather data'}), 500

@climate_control_bp_v2.route('/weather/global')
def get_global_weather():
    """Get global weather data grid"""
    try:
        use_sample = request.args.get('sample', 'true').lower() == 'true'
        
        if use_sample:
            # Use sample data for faster response
            data = climate_service.generate_sample_global_data()
        else:
            # Use real data (will be slower)
            resolution = int(request.args.get('resolution', 10))
            data = climate_service.get_global_weather_grid(resolution)
        
        return jsonify({
            'data': data,
            'timestamp': datetime.now().isoformat(),
            'count': len(data)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@climate_control_bp_v2.route('/weather/forecast/<float:lat>/<float:lon>')
def get_weather_forecast(lat, lon):
    """Get weather forecast for specific coordinates"""
    try:
        url = f"{climate_service.base_url}/forecast"
        params = {
            'latitude': lat,
            'longitude': lon,
            'hourly': 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,shortwave_radiation',
            'timezone': 'auto',
            'forecast_days': 7
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@climate_control_bp_v2.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})
