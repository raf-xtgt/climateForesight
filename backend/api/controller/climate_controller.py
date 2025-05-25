from flask import Blueprint, jsonify, request
import requests
import json
from dotenv import load_dotenv
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
import aiohttp


climate_control_bp = Blueprint('climate_control_bp', __name__)
NASA_POWER_BASE_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"

@climate_control_bp.route('/get-climate-data-parallel', methods=['POST'])
def get_bulk_climate_data_parallel():
    coordinates = request.json.get('coordinates')
    
    if not coordinates:
        return jsonify({"error": "Coordinates array is required"}), 400
    
    def fetch_climate_data(coord):
        """Fetch climate data for a single coordinate"""
        lat = coord['latitude']
        lon = coord['longitude']
        
        params = {
            "community": "AG",
            "parameters": "T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,WS2M",
            "latitude": lat,
            "longitude": lon,
            "start": "2010",
            "end": "2020",
            "format": "JSON"
        }
        
        try:
            response = requests.get(NASA_POWER_BASE_URL, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            props = data['properties']['parameter']
            return {
                "temperature": props["T2M"]["ANN"] if "ANN" in props["T2M"] else None,
                "precipitation": props["PRECTOTCORR"]["ANN"] if "ANN" in props["PRECTOTCORR"] else None,
                "sunlight": props["ALLSKY_SFC_SW_DWN"]["ANN"] if "ANN" in props["ALLSKY_SFC_SW_DWN"] else None,
                "humidity": props["RH2M"]["ANN"] if "ANN" in props["RH2M"] else None,
                "wind_speed": props["WS2M"]["ANN"] if "ANN" in props["WS2M"] else None,
                "coordinates": coord,
                "units": {
                    "temperature": "°C",
                    "precipitation": "mm/day",
                    "sunlight": "MJ/m²/day",
                    "humidity": "%",
                    "wind_speed": "m/s"
                }
            }
        except Exception as e:
            return {
                "error": str(e),
                "coordinates": coord,
                "temperature": None,
                "precipitation": None,
                "sunlight": None,
                "humidity": None,
                "wind_speed": None,
                "units": {
                    "temperature": "°C",
                    "precipitation": "mm/day",
                    "sunlight": "MJ/m²/day",
                    "humidity": "%",
                    "wind_speed": "m/s"
                }
            }
    
    try:
        # Use ThreadPoolExecutor for parallel requests
        with ThreadPoolExecutor(max_workers=5) as executor:  # Limit concurrent requests
            results = list(executor.map(fetch_climate_data, coordinates))
        
        return jsonify({"data": results}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500