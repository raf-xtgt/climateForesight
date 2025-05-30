from dotenv import load_dotenv
import os
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import openmeteo_requests
import pandas as pd
import requests_cache
from retry_requests import retry
import time

load_dotenv()

# Setup the Open-Meteo API client with cache and retry on error
cache_session = requests_cache.CachedSession('.cache', expire_after = 3600)
retry_session = retry(cache_session, retries = 5, backoff_factor = 0.2)
openmeteo = openmeteo_requests.Client(session = retry_session)


MONGO_DB_PASS = os.getenv('MONGO_DB_PASS')
MONGO_DB_USER = os.getenv('MONGO_DB_USER')
uri = f"mongodb+srv://{MONGO_DB_USER}:{MONGO_DB_PASS}@clerkly-dev.fofyy.mongodb.net/?retryWrites=true&w=majority&appName=Clerkly-Dev"
client = MongoClient(uri, server_api=ServerApi('1'))
# Choose database and collection
db = client["climate_foresight_db"]
collection = db["weather_collection"]

try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

def createClimateData():
    resolution = 5
    call_count = 0
    start_time = time.time()
    hour_start_time = start_time
    
    # Rate limiting parameters
    MAX_CALLS_PER_MINUTE = 600
    MAX_CALLS_PER_HOUR = 5000
    MAX_CALLS_PER_DAY = 10000
    calls_this_minute = 0
    calls_this_hour = 0
    calls_this_day = 0
    minute_start_time = start_time
    day_start_time = start_time
    
    for lat in range(-90, 91, resolution):
        for lon in range(-180, 181, resolution):
            current_time = time.time()
            
            # Reset minute counter if a minute has passed
            if current_time - minute_start_time >= 60:
                calls_this_minute = 0
                minute_start_time = current_time
            
            # Reset hour counter if an hour has passed
            if current_time - hour_start_time >= 3600:
                calls_this_hour = 0
                hour_start_time = current_time
            
            # Reset day counter if a day has passed
            if current_time - day_start_time >= 86400:  # 24 hours * 60 minutes * 60 seconds
                calls_this_day = 0
                day_start_time = current_time
            
            # Check if we need to wait due to minute limit
            if calls_this_minute >= MAX_CALLS_PER_MINUTE:
                sleep_time = 60 - (current_time - minute_start_time)
                if sleep_time > 0:
                    print(f"Minute limit reached. Sleeping for {sleep_time:.1f} seconds...")
                    time.sleep(sleep_time)
                    calls_this_minute = 0
                    minute_start_time = time.time()
            
            # Check if we need to wait due to hour limit
            if calls_this_hour >= MAX_CALLS_PER_HOUR:
                sleep_time = 3600 - (current_time - hour_start_time)
                if sleep_time > 0:
                    print(f"Hour limit reached. Sleeping for {sleep_time:.1f} seconds...")
                    time.sleep(sleep_time)
                    calls_this_hour = 0
                    hour_start_time = time.time()
            
            # Check if we need to wait due to daily limit
            if calls_this_day >= MAX_CALLS_PER_DAY:
                sleep_time = 86400 - (current_time - day_start_time)
                if sleep_time > 0:
                    print(f"Daily limit reached. Sleeping for {sleep_time:.1f} seconds ({sleep_time/3600:.1f} hours)...")
                    time.sleep(sleep_time)
                    calls_this_day = 0
                    day_start_time = time.time()
            
            # Make the API call
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lon,
                "hourly": ["temperature_2m", "relative_humidity_2m", "dew_point_2m", 
                          "apparent_temperature", "precipitation", "precipitation_probability", 
                          "rain", "showers", "snowfall", "snow_depth", "weather_code", 
                          "pressure_msl", "surface_pressure", "cloud_cover", "cloud_cover_low", 
                          "cloud_cover_mid", "cloud_cover_high", "visibility", "evapotranspiration", 
                          "et0_fao_evapotranspiration", "vapour_pressure_deficit", "temperature_180m", 
                          "temperature_120m", "temperature_80m", "wind_gusts_10m", "wind_direction_180m", 
                          "wind_direction_120m", "wind_direction_80m", "wind_direction_10m", 
                          "wind_speed_180m", "wind_speed_120m", "wind_speed_80m", "wind_speed_10m", 
                          "soil_temperature_0cm", "soil_temperature_6cm", "soil_temperature_18cm", 
                          "soil_temperature_54cm", "soil_moisture_0_to_1cm", "soil_moisture_1_to_3cm", 
                          "soil_moisture_3_to_9cm", "soil_moisture_9_to_27cm", "soil_moisture_27_to_81cm"],
                "models": "best_match",
                "past_days": 30
            }
            
            try:
                responses = openmeteo.weather_api(url, params=params)
                processResponse(responses)
                
                call_count += 1
                calls_this_minute += 1
                calls_this_hour += 1
                calls_this_day += 1
                
                # Progress update
                if call_count % 100 == 0:
                    elapsed_time = time.time() - start_time
                    print(f"Completed {call_count}/2701 calls in {elapsed_time/60:.1f} minutes")
                
            except Exception as e:
                print(f"Error for lat={lat}, lon={lon}: {e}")
                # Optional: add retry logic here
                continue
    
    total_time = time.time() - start_time
    print(f"Completed all {call_count} API calls in {total_time/60:.1f} minutes ({total_time/3600:.1f} hours)")


def processResponse(responses):
    # Process first location. Add a for-loop for multiple locations or weather models
    response = responses[0]

    # Process hourly data. The order of variables needs to be the same as requested.
    hourly = response.Hourly()
    hourly_temperature_2m = hourly.Variables(0).ValuesAsNumpy()
    hourly_relative_humidity_2m = hourly.Variables(1).ValuesAsNumpy()
    hourly_dew_point_2m = hourly.Variables(2).ValuesAsNumpy()
    hourly_apparent_temperature = hourly.Variables(3).ValuesAsNumpy()
    hourly_precipitation = hourly.Variables(4).ValuesAsNumpy()
    hourly_precipitation_probability = hourly.Variables(5).ValuesAsNumpy()
    hourly_rain = hourly.Variables(6).ValuesAsNumpy()
    hourly_showers = hourly.Variables(7).ValuesAsNumpy()
    hourly_snowfall = hourly.Variables(8).ValuesAsNumpy()
    hourly_snow_depth = hourly.Variables(9).ValuesAsNumpy()
    hourly_weather_code = hourly.Variables(10).ValuesAsNumpy()
    hourly_pressure_msl = hourly.Variables(11).ValuesAsNumpy()
    hourly_surface_pressure = hourly.Variables(12).ValuesAsNumpy()
    hourly_cloud_cover = hourly.Variables(13).ValuesAsNumpy()
    hourly_cloud_cover_low = hourly.Variables(14).ValuesAsNumpy()
    hourly_cloud_cover_mid = hourly.Variables(15).ValuesAsNumpy()
    hourly_cloud_cover_high = hourly.Variables(16).ValuesAsNumpy()
    hourly_visibility = hourly.Variables(17).ValuesAsNumpy()
    hourly_evapotranspiration = hourly.Variables(18).ValuesAsNumpy()
    hourly_et0_fao_evapotranspiration = hourly.Variables(19).ValuesAsNumpy()
    hourly_vapour_pressure_deficit = hourly.Variables(20).ValuesAsNumpy()
    hourly_temperature_180m = hourly.Variables(21).ValuesAsNumpy()
    hourly_temperature_120m = hourly.Variables(22).ValuesAsNumpy()
    hourly_temperature_80m = hourly.Variables(23).ValuesAsNumpy()
    hourly_wind_gusts_10m = hourly.Variables(24).ValuesAsNumpy()
    hourly_wind_direction_180m = hourly.Variables(25).ValuesAsNumpy()
    hourly_wind_direction_120m = hourly.Variables(26).ValuesAsNumpy()
    hourly_wind_direction_80m = hourly.Variables(27).ValuesAsNumpy()
    hourly_wind_direction_10m = hourly.Variables(28).ValuesAsNumpy()
    hourly_wind_speed_180m = hourly.Variables(29).ValuesAsNumpy()
    hourly_wind_speed_120m = hourly.Variables(30).ValuesAsNumpy()
    hourly_wind_speed_80m = hourly.Variables(31).ValuesAsNumpy()
    hourly_wind_speed_10m = hourly.Variables(32).ValuesAsNumpy()
    hourly_soil_temperature_0cm = hourly.Variables(33).ValuesAsNumpy()
    hourly_soil_temperature_6cm = hourly.Variables(34).ValuesAsNumpy()
    hourly_soil_temperature_18cm = hourly.Variables(35).ValuesAsNumpy()
    hourly_soil_temperature_54cm = hourly.Variables(36).ValuesAsNumpy()
    hourly_soil_moisture_0_to_1cm = hourly.Variables(37).ValuesAsNumpy()
    hourly_soil_moisture_1_to_3cm = hourly.Variables(38).ValuesAsNumpy()
    hourly_soil_moisture_3_to_9cm = hourly.Variables(39).ValuesAsNumpy()
    hourly_soil_moisture_9_to_27cm = hourly.Variables(40).ValuesAsNumpy()
    hourly_soil_moisture_27_to_81cm = hourly.Variables(41).ValuesAsNumpy()

    hourly_data = {"date": pd.date_range(
        start = pd.to_datetime(hourly.Time(), unit = "s", utc = True),
        end = pd.to_datetime(hourly.TimeEnd(), unit = "s", utc = True),
        freq = pd.Timedelta(seconds = hourly.Interval()),
        inclusive = "left"
    )}

    hourly_data["temperature_2m"] = hourly_temperature_2m
    hourly_data["relative_humidity_2m"] = hourly_relative_humidity_2m
    hourly_data["dew_point_2m"] = hourly_dew_point_2m
    hourly_data["apparent_temperature"] = hourly_apparent_temperature
    hourly_data["precipitation"] = hourly_precipitation
    hourly_data["precipitation_probability"] = hourly_precipitation_probability
    hourly_data["rain"] = hourly_rain
    hourly_data["showers"] = hourly_showers
    hourly_data["snowfall"] = hourly_snowfall
    hourly_data["snow_depth"] = hourly_snow_depth
    hourly_data["weather_code"] = hourly_weather_code
    hourly_data["pressure_msl"] = hourly_pressure_msl
    hourly_data["surface_pressure"] = hourly_surface_pressure
    hourly_data["cloud_cover"] = hourly_cloud_cover
    hourly_data["cloud_cover_low"] = hourly_cloud_cover_low
    hourly_data["cloud_cover_mid"] = hourly_cloud_cover_mid
    hourly_data["cloud_cover_high"] = hourly_cloud_cover_high
    hourly_data["visibility"] = hourly_visibility
    hourly_data["evapotranspiration"] = hourly_evapotranspiration
    hourly_data["et0_fao_evapotranspiration"] = hourly_et0_fao_evapotranspiration
    hourly_data["vapour_pressure_deficit"] = hourly_vapour_pressure_deficit
    hourly_data["temperature_180m"] = hourly_temperature_180m
    hourly_data["temperature_120m"] = hourly_temperature_120m
    hourly_data["temperature_80m"] = hourly_temperature_80m
    hourly_data["wind_gusts_10m"] = hourly_wind_gusts_10m
    hourly_data["wind_direction_180m"] = hourly_wind_direction_180m
    hourly_data["wind_direction_120m"] = hourly_wind_direction_120m
    hourly_data["wind_direction_80m"] = hourly_wind_direction_80m
    hourly_data["wind_direction_10m"] = hourly_wind_direction_10m
    hourly_data["wind_speed_180m"] = hourly_wind_speed_180m
    hourly_data["wind_speed_120m"] = hourly_wind_speed_120m
    hourly_data["wind_speed_80m"] = hourly_wind_speed_80m
    hourly_data["wind_speed_10m"] = hourly_wind_speed_10m
    hourly_data["soil_temperature_0cm"] = hourly_soil_temperature_0cm
    hourly_data["soil_temperature_6cm"] = hourly_soil_temperature_6cm
    hourly_data["soil_temperature_18cm"] = hourly_soil_temperature_18cm
    hourly_data["soil_temperature_54cm"] = hourly_soil_temperature_54cm
    hourly_data["soil_moisture_0_to_1cm"] = hourly_soil_moisture_0_to_1cm
    hourly_data["soil_moisture_1_to_3cm"] = hourly_soil_moisture_1_to_3cm
    hourly_data["soil_moisture_3_to_9cm"] = hourly_soil_moisture_3_to_9cm
    hourly_data["soil_moisture_9_to_27cm"] = hourly_soil_moisture_9_to_27cm
    hourly_data["soil_moisture_27_to_81cm"] = hourly_soil_moisture_27_to_81cm

    hourly_dataframe = pd.DataFrame(data = hourly_data)
    records = []

    for _, row in hourly_dataframe.iterrows():
        
        doc = {
            "datetime": row["date"].isoformat(),
            "date": row["date"].date().isoformat(),        
            "latitude": response.Latitude(),
            "longitude": response.Longitude()
        }
        for col in hourly_dataframe.columns:
            if col != "date":
                doc[col] = row[col]

        records.append(doc)

    if records:
        result = collection.insert_many(records)


createClimateData()
print("Mongodb data insertion complete")

# # Insert the document
# insert_result = collection.insert_one(sample_data)

# # Confirm the insertion
# print("Inserted document with ID:", insert_result.inserted_id)
