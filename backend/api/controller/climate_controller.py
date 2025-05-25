from flask import Blueprint, jsonify, request, Response
import json

climate_control_bp = Blueprint('climate_control_bp', __name__)
NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"

@climate_control_bp.route('/get-climate-data', methods=['POST'])
def get_bulk_climate_data():
    print("requests", request.json)
    coordinates = request.json.get('coordinates')
    
    if not coordinates:
        return jsonify({"error": "Coordinates array is required"}), 400
    
    results = []
    for coord in coordinates:
        params = {
            "latitude": coord["latitude"],
            "longitude": coord["longitude"],
            "community": "AG",
            "parameters": "T2M,PRECTOT,ALLSKY_SFC_SW_DWN,RH2M,WS2M",
            "format": "JSON",
            "start": "2010",
            "end": "2020",
            "annual": "true"
        }
        
        data = fetch_nasa_power_data(params)
        
        if "error" not in data:
            results.append({
                "temperature": data["properties"]["parameter"]["T2M"]["ANN"],
                "precipitation": data["properties"]["parameter"]["PRECTOT"]["ANN"],
                "sunlight": data["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]["ANN"],
                "humidity": data["properties"]["parameter"]["RH2M"]["ANN"],
                "wind_speed": data["properties"]["parameter"]["WS2M"]["ANN"],
                "coordinates": {
                    "latitude": coord["latitude"],
                    "longitude": coord["longitude"]
                }
            })
    
    return jsonify(results)


def fetch_nasa_power_data(params):
    try:
        response = requests.get(NASA_POWER_URL, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}