from dotenv import load_dotenv
import os
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import pandas as pd
import requests_cache
from retry_requests import retry
import time
from datetime import datetime, timedelta
import requests

load_dotenv()



MONGO_DB_PASS = os.getenv('MONGO_DB_PASS')
MONGO_DB_USER = os.getenv('MONGO_DB_USER')
uri = f"mongodb+srv://{MONGO_DB_USER}:{MONGO_DB_PASS}@clerkly-dev.fofyy.mongodb.net/?retryWrites=true&w=majority&appName=Clerkly-Dev"
client = MongoClient(uri, server_api=ServerApi('1'))
# Choose database and collection
db = client["climate_foresight_db"]
collection = db["weather_collection"]
NASA_POWER_HOURLY_URL = "https://power.larc.nasa.gov/api/temporal/hourly/point"

try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

def createClimateData():
    resolution = 5
    call_count = 0
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    start_str = start_date.strftime("%Y%m%d")
    end_str = end_date.strftime("%Y%m%d")
    for lat in range(25, 91, resolution):
        for lon in range(-180, 181, resolution):
            
            params = {
                "latitude": lat,
                "longitude": lon,
                "community": "ag", 
                "parameters": "T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,WS2M",
                "start": start_str,
                "end": end_str,
                "format": "JSON"
            }
            
            try:
                response = requests.get(NASA_POWER_HOURLY_URL, params=params, timeout=90)
                response.raise_for_status()
                data = response.json()
                
                processResponse(data, lat, lon)
                call_count += 1
                # Progress update
                print(f"Completed {call_count}/1022 calls")
                
            except Exception as e:
                print(f"Error for lat={lat}, lon={lon}: {e}")
                # Optional: add retry logic here
                call_count += 1
                # Progress update
                print(f"Completed {call_count}/1022 calls")
                continue

def runFromBrokenData():
    resolution = 5
    call_count = 0
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    start_str = start_date.strftime("%Y%m%d")
    end_str = end_date.strftime("%Y%m%d")
    lat = 20
    for lon in range(20, 181, resolution):
            
        params = {
            "latitude": lat,
            "longitude": lon,
            "community": "ag", 
            "parameters": "T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,WS2M",
            "start": start_str,
            "end": end_str,
            "format": "JSON"
        }
            
        try:
            response = requests.get(NASA_POWER_HOURLY_URL, params=params, timeout=90)
            response.raise_for_status()
            data = response.json()
                
            processResponse(data, lat, lon)
                
            call_count += 1
            # Progress update
            print(f"Completed {call_count}/2701 calls")
                
        except Exception as e:
            print(f"Error for lat={lat}, lon={lon}: {e}")
            # Optional: add retry logic here
            continue
    print("Finished for completing broken data")
    

def processResponse(data, lat, lon):
    weather_grid = []
    props = data['properties']['parameter']
    for hour_key in props["T2M"].keys():
        date_str = hour_key[:8]
        iso_timestamp = convert_nasa_timestamp(hour_key)

        weather_grid.append({
            'date': hour_key[:8],
            'timestamp': iso_timestamp,
            'temperature': props["T2M"][hour_key],
            'humidity': props["RH2M"][hour_key],
            'windSpeed': props["WS2M"][hour_key],
            'precipitation': props["PRECTOTCORR"][hour_key],
            'sunlight': props["ALLSKY_SFC_SW_DWN"][hour_key],
            'lat': lat,
            'lon':lon
        })


    if weather_grid:
        result = collection.insert_many(weather_grid)

def convert_nasa_timestamp(nasa_timestamp):
    """Convert NASA timestamp to ISO 8601 format with timezone"""
    try:
        # Try full timestamp with hour (YYYYMMDDHH)
        dt = datetime.strptime(nasa_timestamp, "%Y%m%d%H")
    except ValueError:
        try:
            # Fallback to date only (YYYYMMDD) - set to midnight
            dt = datetime.strptime(nasa_timestamp, "%Y%m%d")
        except ValueError:
            # If still fails, return original with UTC timezone
            return f"{nasa_timestamp}T00:00:00+00:00"
    return dt.strftime("%Y-%m-%dT%H:%M:%S+00:00")


createClimateData()
# runFromBrokenData()
print("Data insertion to mongodb complete")

# # Insert the document
# insert_result = collection.insert_one(sample_data)

# # Confirm the insertion
# print("Inserted document with ID:", insert_result.inserted_id)
