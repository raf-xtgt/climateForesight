
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import numpy as np
from datetime import datetime, timedelta
import json
import math

class ClimateDataService:
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1"
        
    def get_weather_data(self, lat, lon):
        """Get current weather data for a specific location"""
        try:
            url = f"{self.base_url}/forecast"
            params = {
                'latitude': lat,
                'longitude': lon,
                'current': 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation',
                'hourly': 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,shortwave_radiation',
                'timezone': 'auto',
                'forecast_days': 1
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching weather data: {e}")
            return None
    
    def get_global_weather_grid(self, resolution=5):
        """Get weather data for a global grid"""
        weather_grid = []
        
        # Create a grid with specified resolution (degrees)
        for lat in range(-90, 91, resolution):
            for lon in range(-180, 181, resolution):
                data = self.get_weather_data(lat, lon)
                if data and 'current' in data:
                    current = data['current']
                    hourly = data.get('hourly', {})
                    
                    # Calculate average sunlight (shortwave radiation)
                    sunlight = 0
                    if 'shortwave_radiation' in hourly and hourly['shortwave_radiation']:
                        valid_radiation = [r for r in hourly['shortwave_radiation'] if r is not None]
                        sunlight = sum(valid_radiation) / len(valid_radiation) if valid_radiation else 0
                    
                    weather_point = {
                        'lat': lat,
                        'lon': lon,
                        'temperature': current.get('temperature_2m', 0),
                        'humidity': current.get('relative_humidity_2m', 0),
                        'windSpeed': current.get('wind_speed_10m', 0),
                        'precipitation': current.get('precipitation', 0),
                        'sunlight': sunlight
                    }
                    weather_grid.append(weather_point)
        
        return weather_grid
    
    def generate_sample_global_data(self):
        """Generate sample global climate data for demonstration"""
        weather_grid = []
        
        # Generate data every 10 degrees for faster loading
        for lat in range(-90, 91, 10):
            for lon in range(-180, 181, 10):
                # Simulate realistic climate patterns
                # Temperature: warmer near equator, colder at poles
                base_temp = 30 - abs(lat) * 0.6
                temp_variation = np.random.normal(0, 5)
                temperature = base_temp + temp_variation
                
                # Humidity: higher in tropics and coastal areas
                humidity = max(20, min(100, 70 + np.random.normal(0, 15) - abs(lat) * 0.3))
                
                # Wind speed: random with some geographic patterns
                wind_speed = max(0, np.random.exponential(8))
                
                # Precipitation: higher in tropics, lower in deserts
                if abs(lat) < 30:  # Tropical zone
                    precipitation = max(0, np.random.exponential(2))
                else:
                    precipitation = max(0, np.random.exponential(0.5))
                
                # Sunlight: function of latitude and random weather
                max_sunlight = 1000 * math.cos(math.radians(abs(lat)))
                sunlight = max(0, max_sunlight * (0.7 + np.random.uniform(0, 0.3)))
                
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