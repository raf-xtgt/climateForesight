from flask import Flask, jsonify, Blueprint, request, send_file
from flask_cors import CORS
import requests
import numpy as np
from datetime import datetime, timedelta
import json
import math
from scipy.interpolate import griddata, RegularGridInterpolator
from PIL import Image, ImageDraw
import io
import base64
from dotenv import load_dotenv
import os
from pymongo.errors import PyMongoError
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi


load_dotenv()

bp_v3 = Blueprint('bp_v3', __name__)
MONGO_DB_PASS = os.getenv('MONGO_DB_PASS')
MONGO_DB_USER = os.getenv('MONGO_DB_USER')
uri = f"mongodb+srv://{MONGO_DB_USER}:{MONGO_DB_PASS}@clerkly-dev.fofyy.mongodb.net/?retryWrites=true&w=majority&appName=Clerkly-Dev"
client = MongoClient(uri, server_api=ServerApi('1'))
# Choose database and collection
db = client["climate_foresight_db"]
collection = db["weather_collection"]

class AdvancedClimateService:
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1"
        self.NASA_POWER_BASE_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"

        
    def generate_dense_global_data(self, resolution=2):
        """Generate denser climate data for smooth interpolation"""
        weather_grid = []
        
        # Generate data with higher resolution
        for lat in range(-90, 91, resolution):
            for lon in range(-180, 181, resolution):
                # Enhanced realistic climate patterns
                # Temperature with latitude, altitude, and seasonal effects
                base_temp = 30 - abs(lat) * 0.6
                seasonal_factor = math.cos(math.radians(lat * 4))  # Simulate seasonal variation
                temp_variation = np.random.normal(0, 3)
                temperature = base_temp + seasonal_factor * 5 + temp_variation
                
                # Humidity with geographic patterns
                coastal_factor = 1 + 0.3 * math.sin(math.radians(lon * 2))
                humidity = max(20, min(100, 70 + np.random.normal(0, 10) - abs(lat) * 0.2 + coastal_factor * 10))
                
                # Wind speed with jet stream simulation
                jet_stream_lat = 40 + 10 * math.sin(math.radians(lon / 2))
                wind_base = 5 + 15 * math.exp(-((lat - jet_stream_lat) / 10) ** 2)
                wind_speed = max(0, wind_base + np.random.normal(0, 3))
                
                # Precipitation with ITCZ and monsoon patterns
                itcz_lat = 5 * math.sin(math.radians(lon / 3))
                monsoon_factor = math.exp(-((lat - itcz_lat) / 15) ** 2)
                precipitation = max(0, monsoon_factor * 8 + np.random.exponential(1))
                
                # Sunlight with realistic solar patterns
                solar_declination = 23.5 * math.sin(math.radians(lon))
                max_sunlight = 1000 * max(0, math.cos(math.radians(abs(lat - solar_declination))))
                cloud_factor = 1 - (precipitation / 10) * 0.5
                sunlight = max(0, max_sunlight * cloud_factor * (0.8 + np.random.uniform(0, 0.2)))
                
                weather_point = {
                    'lat': lat,
                    'lon': lon,
                    'temperature': round(temperature, 1),
                    'humidity': round(humidity, 1),
                    'windSpeed': round(wind_speed, 1),
                    'precipitation': round(precipitation, 2),
                    'sunlight': round(sunlight, 1)
                }
                weather_grid.append(weather_point)
        
        return weather_grid
    


    def generate_dense_global_data_from_api(self, resolution=2, date=None, hour=0):
        """Generate denser climate data for smooth interpolation"""
        weather_grid = []

        # Calculate date range (last 90 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        # Format dates as YYYYMMDD strings
        start_str = start_date.strftime("%Y%m%d")
        end_str = end_date.strftime("%Y%m%d")
        
        # Generate data with higher resolution
        for lat in range(-90, 91, resolution):
            for lon in range(-180, 181, resolution):
                params = {
                    "latitude": lat,
                    "longitude": lon,
                    "community": "ag", 
                    "parameters": "T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,WS2M",
                    "start": start_str,
                    "end": end_str,
                    "format": "JSON",
                    "time-standard": "lst"  # local standard time
                }

                try:
                    response = requests.get(self.NASA_POWER_BASE_URL, params=params, timeout=30)
                    response.raise_for_status()
                    data = response.json()
                    
                    props = data['properties']['parameter']
                    # print("props", props)
                    weather_point = {
                        'lat': lat,
                        'lon': lon,
                        'temperature': props["T2M"]["ANN"],
                        'humidity': props["RH2M"]["ANN"],
                        'windSpeed': props["WS2M"]["ANN"],
                        'precipitation': props["PRECTOTCORR"]["ANN"],
                        'sunlight': props["ALLSKY_SFC_SW_DWN"]["ANN"]
                    }
                    weather_grid.append(weather_point)

                except requests.exceptions.HTTPError as e:
                    print(f"HTTP Error for lat {lat}, lon {lon}: {str(e)}")
                    continue
                except Exception as e:
                    print(f"Error processing lat {lat}, lon {lon}: {str(e)}")
                    continue
        return weather_grid
    


    def interpolate_climate_grid(self, data, target_resolution=1):
        """Create interpolated grid for smooth visualization"""
        if not data:
            return []
            
        # Extract coordinates and values
        lats = np.array([point['lat'] for point in data])
        lons = np.array([point['lon'] for point in data])
        
        # Create target grid
        target_lats = np.arange(-90, 91, target_resolution)
        target_lons = np.arange(-180, 181, target_resolution)
        target_lon_grid, target_lat_grid = np.meshgrid(target_lons, target_lats)
        
        interpolated_data = []
        
        # Interpolate each climate variable
        for variable in ['temperature', 'humidity', 'windSpeed', 'precipitation', 'sunlight']:
            values = np.array([point[variable] for point in data])
            
            # Use griddata for interpolation
            interpolated_values = griddata(
                (lats, lons), values, 
                (target_lat_grid, target_lon_grid), 
                method='cubic', 
                fill_value=np.mean(values)
            )
            
            # Store interpolated results
            for i, lat in enumerate(target_lats):
                for j, lon in enumerate(target_lons):
                    if len(interpolated_data) <= i * len(target_lons) + j:
                        interpolated_data.append({
                            'lat': lat,
                            'lon': lon,
                            variable: float(interpolated_values[i, j])
                        })
                    else:
                        interpolated_data[i * len(target_lons) + j][variable] = float(interpolated_values[i, j])
        
        return interpolated_data
    
    def generate_climate_heatmap(self, data, variable='temperature', width=1024, height=512):
        """Generate heatmap image for climate data"""
        if not data:
            return None
    
        # Create coordinate arrays
        lats = np.array([point['lat'] for point in data])
        lons = np.array([point['lon'] for point in data])
        values = np.array([point[variable] for point in data])
        
        # Create regular grid
        grid_lons = np.linspace(-180, 180, width)
        grid_lats = np.linspace(90, -90, height)  # Flip for image coordinates
        grid_lon_mesh, grid_lat_mesh = np.meshgrid(grid_lons, grid_lats)
        
        # Interpolate values to grid
        grid_values = griddata(
            (lons, lats), values,
            (grid_lon_mesh, grid_lat_mesh),
            method='linear',
            fill_value=np.mean(values)
        )
        
        # Normalize values for color mapping
        vmin, vmax = np.nanmin(grid_values), np.nanmax(grid_values)
        normalized_values = (grid_values - vmin) / (vmax - vmin)
        
        # Create color image
        img = Image.new('RGBA', (width, height))
        pixels = []
        
        for row in normalized_values:
            for val in row:
                if np.isnan(val):
                    pixels.append((0, 0, 0, 0))  # Transparent
                else:
                    color = self.value_to_color(val, variable)
                    pixels.append(color)
        
        img.putdata(pixels)
        return img
    
    def value_to_color(self, normalized_value, variable):
        """Convert normalized value to RGBA color with better color scales"""
        alpha = 200  # Less transparent
        
        if variable == 'temperature':
            # Temperature color scale (blue to red)
            if normalized_value < 0.25:
                r = 0
                g = int(normalized_value * 4 * 255)
                b = 255
            elif normalized_value < 0.5:
                r = 0
                g = 255
                b = int((1 - (normalized_value - 0.25) * 4) * 255)
            elif normalized_value < 0.75:
                r = int((normalized_value - 0.5) * 4 * 255)
                g = 255
                b = 0
            else:
                r = 255
                g = int((1 - (normalized_value - 0.75) * 4) * 255)
                b = 0
            return (r, g, b, alpha)
        
        elif variable == 'humidity':
            # Humidity (blue to white)
            intensity = int(normalized_value * 255)
            return (intensity, intensity, 255, alpha)
        
        elif variable == 'windSpeed':
            # Wind speed (green to yellow to red)
            if normalized_value < 0.5:
                r = int(normalized_value * 2 * 255)
                g = 255
                b = 0
            else:
                r = 255
                g = int((1 - (normalized_value - 0.5) * 2) * 255)
                b = 0
            return (r, g, b, alpha)
        
        elif variable == 'precipitation':
            # Precipitation (light blue to dark blue)
            r = 0
            g = int((1 - normalized_value) * 200)
            b = 100 + int(normalized_value * 155)
            return (r, g, b, alpha)
        
        elif variable == 'sunlight':
            # Sunlight (yellow to orange to red)
            r = 255
            g = int((1 - normalized_value * 0.7) * 255)
            b = 0
            return (r, g, b, alpha)
        
        return (255, 255, 255, alpha)

    def generate_hourly_global_data(self, resolution=2, date=None, hour=0):
        """Generate hourly climate data with temporal variations"""
        if date is None:
            date = datetime.now().date()
        
        weather_grid = []
        
        # Calculate day of year for seasonal effects
        day_of_year = date.timetuple().tm_yday
        seasonal_angle = 2 * math.pi * day_of_year / 365.25
        
        # Calculate solar angle for the hour
        solar_hour_angle = (hour - 12) * 15  # 15 degrees per hour from solar noon
        
        for lat in range(-90, 91, resolution):
            for lon in range(-180, 181, resolution):
                # Enhanced realistic climate patterns with temporal variations
                
                # Base temperature with seasonal and diurnal variations
                base_temp = 30 - abs(lat) * 0.6
                seasonal_factor = math.cos(math.radians(lat * 4)) * math.sin(seasonal_angle)
                
                # Diurnal temperature variation (cooler at night, warmer during day)
                diurnal_factor = 8 * math.cos(math.radians(solar_hour_angle + lon/15))  # Account for longitude
                local_solar_time = (hour + lon/15) % 24
                if local_solar_time < 6 or local_solar_time > 18:
                    diurnal_factor *= 0.7  # Reduce variation at night
                
                temp_variation = np.random.normal(0, 2)
                temperature = base_temp + seasonal_factor * 5 + diurnal_factor + temp_variation
                
                # Humidity with time-based variations (higher at night/early morning)
                coastal_factor = 1 + 0.3 * math.sin(math.radians(lon * 2))
                time_humidity_factor = 10 * math.cos(math.radians((local_solar_time - 6) * 15))  # Peak at 6 AM
                humidity = max(20, min(100, 70 + np.random.normal(0, 8) - abs(lat) * 0.2 + coastal_factor * 8 + time_humidity_factor))
                
                # Wind speed with diurnal variations (often stronger during day)
                jet_stream_lat = 40 + 10 * math.sin(math.radians(lon / 2))
                wind_base = 5 + 15 * math.exp(-((lat - jet_stream_lat) / 10) ** 2)
                diurnal_wind_factor = 3 * math.sin(math.radians((local_solar_time - 12) * 15))  # Peak in afternoon
                wind_speed = max(0, wind_base + diurnal_wind_factor + np.random.normal(0, 2))
                
                # Precipitation with temporal patterns (often peaks in afternoon/evening)
                itcz_lat = 5 * math.sin(math.radians(lon / 3))
                monsoon_factor = math.exp(-((lat - itcz_lat) / 15) ** 2)
                time_precip_factor = max(0, 2 * math.sin(math.radians((local_solar_time - 15) * 15)))  # Peak at 3 PM
                precipitation = max(0, monsoon_factor * 6 + time_precip_factor + np.random.exponential(0.8))
                
                # Sunlight with realistic solar patterns and cloud effects
                solar_declination = 23.5 * math.sin(seasonal_angle)
                solar_elevation = math.sin(math.radians(lat)) * math.sin(math.radians(solar_declination)) + \
                                math.cos(math.radians(lat)) * math.cos(math.radians(solar_declination)) * \
                                math.cos(math.radians(solar_hour_angle))
                
                if solar_elevation > 0:
                    max_sunlight = 1000 * solar_elevation
                    cloud_factor = 1 - (precipitation / 12) * 0.6
                    atmospheric_factor = 0.7 + 0.3 * solar_elevation  # Atmospheric absorption
                    sunlight = max(0, max_sunlight * cloud_factor * atmospheric_factor * (0.85 + np.random.uniform(0, 0.15)))
                else:
                    sunlight = 0  # No sunlight when sun is below horizon
                
                weather_point = {
                    'lat': lat,
                    'lon': lon,
                    'temperature': round(temperature, 1),
                    'humidity': round(humidity, 1),
                    'windSpeed': round(wind_speed, 1),
                    'precipitation': round(precipitation, 2),
                    'sunlight': round(sunlight, 1),
                    'timestamp': datetime.combine(date, datetime.min.time().replace(hour=hour)).isoformat()
                }
                weather_grid.append(weather_point)
        
        # print("Size of weather grid:", str(len(weather_grid)))
        return weather_grid

climate_service = AdvancedClimateService()

@bp_v3.route('/weather/heatmap/<variable>')
def get_climate_heatmap(variable):
    """Generate and return climate data as heatmap image"""
    try:
        width = int(request.args.get('width', 1024))
        height = int(request.args.get('height', 512))
        resolution = int(request.args.get('resolution', 5))
        
        # Generate climate data
        data = climate_service.generate_dense_global_data(resolution)
        
        # Generate heatmap image
        img = climate_service.generate_climate_heatmap(data, variable, width, height)
        
        if img is None:
            return jsonify({'error': 'Failed to generate heatmap'}), 500
        
        # Convert image to base64 for response
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        
        return jsonify({
            'image': f'data:image/png;base64,{img_base64}',
            'width': width,
            'height': height,
            'variable': variable
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp_v3.route('/weather/wind-particles')
def get_wind_particles():
    """Generate wind particle data for animated visualization"""
    try:
        resolution = int(request.args.get('resolution', 10))
        particle_count = int(request.args.get('particles', 1000))
        
        # Generate wind data
        data = climate_service.generate_dense_global_data(resolution)
        wind_data = []
        
        for point in data:
            # Generate wind direction (random for demo, should be from real data)
            wind_direction = np.random.uniform(0, 360)
            wind_u = point['windSpeed'] * math.cos(math.radians(wind_direction))
            wind_v = point['windSpeed'] * math.sin(math.radians(wind_direction))
            
            wind_data.append({
                'lat': point['lat'],
                'lon': point['lon'],
                'u': wind_u,  # East-west component
                'v': wind_v,  # North-south component
                'speed': point['windSpeed']
            })
        
        return jsonify({
            'windData': wind_data,
            'particleCount': particle_count,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp_v3.route('/weather/heatmap-with-timestamps/<variable>')
def get_climate_heatmap_with_timestamps(variable):
    """Generate hourly heatmap images for a full day"""
    try:
        width = int(request.args.get('width', 1024))
        height = int(request.args.get('height', 512))
        resolution = int(request.args.get('resolution', 5))
        date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        # Parse date
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            target_date = datetime.now().date()
        
        hourly_images = []
        
        # Generate heatmap for each hour of the day
        for hour in range(24):
            # Generate hourly climate data
            data = climate_service.generate_hourly_global_data(resolution, target_date, hour)
            # print("hourly data size", str(len(data)))

            # print("hourly data")
            # print(data)
            # Generate heatmap image
            img = climate_service.generate_climate_heatmap(data, variable, width, height)
            
            if img is None:
                continue
            
            # Convert image to base64
            img_buffer = io.BytesIO()
            img.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
            
            # Format hour for display (12-hour format with AM/PM)
            hour_12 = hour if hour <= 12 else hour - 12
            if hour_12 == 0:
                hour_12 = 12
            ampm = 'AM' if hour < 12 else 'PM'
            formatted_time = f"{hour_12}:00 {ampm}"
            
            hourly_images.append({
                'hour': hour,
                'formatted_time': formatted_time,
                'timestamp': datetime.combine(target_date, datetime.min.time().replace(hour=hour)).isoformat(),
                'image': f'data:image/png;base64,{img_base64}'
            })
        
        response_data = {
            'date': date_str,
            'variable': variable,
            'width': width,
            'height': height,
            'resolution': resolution,
            'hourly_data': hourly_images,
            'total_hours': len(hourly_images)
        }

        print(json.dumps(response_data, indent=4))  # Pretty-prints the JSON to the console

        return jsonify(response_data)

        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp_v3.route('/weather/heatmap-with-timestamps/nasa-api/<variable>')
def get_climate_heatmap_with_timestamps_api(variable):
    """Generate hourly heatmap images for a full day"""
    try:
        width = int(request.args.get('width', 1024))
        height = int(request.args.get('height', 512))
        resolution = int(request.args.get('resolution', 5))
        date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        # Parse date
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            target_date = datetime.now().date()
        
        hourly_images = []
        
        # Generate heatmap for each hour of the day
        for hour in range(3):
            # Generate hourly climate data
            data = climate_service.generate_dense_global_data_from_api(resolution, target_date, hour)
            # print("hourly data size", str(len(data)))
            # print(data)
            # Generate heatmap image
            img = climate_service.generate_climate_heatmap(data, variable, width, height)
            
            if img is None:
                continue
            
            # Convert image to base64
            img_buffer = io.BytesIO()
            img.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
            
            # Format hour for display (12-hour format with AM/PM)
            hour_12 = hour if hour <= 12 else hour - 12
            if hour_12 == 0:
                hour_12 = 12
            ampm = 'AM' if hour < 12 else 'PM'
            formatted_time = f"{hour_12}:00 {ampm}"
            
            hourly_images.append({
                'hour': hour,
                'formatted_time': formatted_time,
                'timestamp': datetime.combine(target_date, datetime.min.time().replace(hour=hour)).isoformat(),
                'image': f'data:image/png;base64,{img_base64}'
            })
        
        return jsonify({
            'date': date_str,
            'variable': variable,
            'width': width,
            'height': height,
            'resolution': resolution,
            'hourly_data': hourly_images,
            'total_hours': len(hourly_images)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp_v3.route('/weather/heatmap-with-timestamps/v2/<variable>')
def get_climate_heatmap_with_timestamps_api_v2(variable):
    """Generate hourly heatmap images for a full day"""
    try:
        width = int(request.args.get('width', 1024))
        height = int(request.args.get('height', 512))
        resolution = int(request.args.get('resolution', 5))
        date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        # Parse date
        target_date = '20250525'
        hourly_timestamps = generate_hourly_timestamps(target_date)
        hourly_images = []
        data = findDocumentsByExactDate(target_date, collection)
        print("retrieve data from mongo")
        # Generate heatmap for each hour of the day
        for ts in hourly_timestamps:
            filtered_docs = list(filter(lambda doc: doc.get('timestamp') == ts, data))
            print("filtered for timestamps")
            img = climate_service.generate_climate_heatmap(filtered_docs, variable, width, height)
            print("generated heatmap")            
            if img is None:
                continue
            
            # Convert image to base64
            img_buffer = io.BytesIO()
            img.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
            
            # Format hour for display (12-hour format with AM/PM)
        
            dt = datetime.fromisoformat(ts)
            hour = dt.hour  # Adds hour field to the document
            hour_12 = hour if hour <= 12 else hour - 12
            if hour_12 == 0:
                hour_12 = 12
            ampm = 'AM' if hour < 12 else 'PM'
            formatted_time = f"{hour_12}:00 {ampm}"
            
            hourly_images.append({
                'hour': hour,
                'formatted_time': formatted_time,
                'timestamp': ts,
                'image': f'data:image/png;base64,{img_base64}'
            })
        
        return jsonify({
            'date': date_str,
            'variable': variable,
            'width': width,
            'height': height,
            'resolution': resolution,
            'hourly_data': hourly_images,
            'total_hours': len(hourly_images)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def findDocumentsByExactDate(target_date, collection):
    """
    Find documents with exact date match, with error handling
    
    Args:
        target_date (str): The date string to match
        collection: The MongoDB collection to search in
        
    Returns:
        list: Matching documents, or None if error occurs
    """
    try:
        pipeline = [
            {
                "$search": {
                    "index": "weather_collection_date_index",
                    "text": {
                        "query": target_date,
                        "path": "date"
                    }
                }
            }
        ]
        return list(collection.aggregate(pipeline))
    except PyMongoError as e:
        print(f"An error occurred: {e}")
        return None



def generate_hourly_timestamps(target_date):
    try:
        parsed_date = datetime.strptime(target_date, "%Y%m%d")
    except ValueError:
        raise ValueError("Invalid date format. Expected 'YYYYMMDD' (e.g., '20250529').")

    # Step 2: Generate hourly timestamps for the day
    hourly_timestamps = [
        (parsed_date + timedelta(hours=hour)).strftime("%Y-%m-%dT%H:%M:%S+00:00")
        for hour in range(24)
    ]
    return hourly_timestamps

