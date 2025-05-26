// utils/climateApi.ts

export interface ClimateDataPoint {
    lat: number
    lon: number
    temperature: number
    humidity: number
    windSpeed: number
    precipitation: number
    sunlight: number
  }
  
  export interface GlobalClimateResponse {
    data: ClimateDataPoint[]
    timestamp: string
    count: number
  }
  
  export interface WeatherForecast {
    hourly: {
      time: string[]
      temperature_2m: number[]
      relative_humidity_2m: number[]
      wind_speed_10m: number[]
      wind_direction_10m: number[]
      precipitation: number[]
      shortwave_radiation: number[]
    }
  }
  
  class ClimateApiService {
    private baseUrl: string
  
    constructor(baseUrl: string = 'http://localhost:5000/api') {
      this.baseUrl = baseUrl
    }
  
    async getGlobalClimateData(useSample: boolean = true): Promise<GlobalClimateResponse> {
      try {
        const response = await fetch(`${this.baseUrl}/weather/global?sample=${useSample}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return await response.json()
      } catch (error) {
        console.error('Error fetching global climate data:', error)
        throw error
      }
    }
  
    async getCurrentWeather(lat: number, lon: number): Promise<any> {
      try {
        const response = await fetch(`${this.baseUrl}/weather/current/${lat}/${lon}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return await response.json()
      } catch (error) {
        console.error('Error fetching current weather:', error)
        throw error
      }
    }
  
    async getWeatherForecast(lat: number, lon: number): Promise<WeatherForecast> {
      try {
        const response = await fetch(`${this.baseUrl}/weather/forecast/${lat}/${lon}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return await response.json()
      } catch (error) {
        console.error('Error fetching weather forecast:', error)
        throw error
      }
    }
  
    async checkApiHealth(): Promise<boolean> {
      try {
        const response = await fetch(`${this.baseUrl}/health`)
        return response.ok
      } catch (error) {
        console.error('API health check failed:', error)
        return false
      }
    }
  }
  
  // Export singleton instance
  export const climateApi = new ClimateApiService()
  
  // Utility functions for data processing
  export const processClimateData = {
    normalizeTemperature: (temp: number): number => {
      // Normalize temperature to 0-1 range (-40°C to 50°C)
      return Math.max(0, Math.min(1, (temp + 40) / 90))
    },
  
    normalizeHumidity: (humidity: number): number => {
      // Normalize humidity to 0-1 range
      return Math.max(0, Math.min(1, humidity / 100))
    },
  
    normalizeWindSpeed: (windSpeed: number): number => {
      // Normalize wind speed to 0-1 range (0-30 m/s)
      return Math.max(0, Math.min(1, windSpeed / 30))
    },
  
    normalizePrecipitation: (precipitation: number): number => {
      // Normalize precipitation to 0-1 range (0-10 mm)
      return Math.max(0, Math.min(1, precipitation / 10))
    },
  
    normalizeSunlight: (sunlight: number): number => {
      // Normalize sunlight to 0-1 range (0-1000 W/m²)
      return Math.max(0, Math.min(1, sunlight / 1000))
    },
  
    getIntensityLevel: (value: number, type: 'temperature' | 'humidity' | 'windSpeed' | 'precipitation' | 'sunlight'): 'low' | 'medium' | 'high' => {
      const normalized = (() => {
        switch (type) {
          case 'temperature': return processClimateData.normalizeTemperature(value)
          case 'humidity': return processClimateData.normalizeHumidity(value)
          case 'windSpeed': return processClimateData.normalizeWindSpeed(value)
          case 'precipitation': return processClimateData.normalizePrecipitation(value)
          case 'sunlight': return processClimateData.normalizeSunlight(value)
          default: return 0
        }
      })()
  
      if (normalized < 0.33) return 'low'
      if (normalized < 0.66) return 'medium'
      return 'high'
    },
  
    formatValue: (value: number, type: 'temperature' | 'humidity' | 'windSpeed' | 'precipitation' | 'sunlight'): string => {
      const units = {
        temperature: '°C',
        humidity: '%',
        windSpeed: ' m/s',
        precipitation: ' mm',
        sunlight: ' W/m²'
      }
  
      const rounded = Math.round(value * 10) / 10
      return `${rounded}${units[type]}`
    }
  }
  
  // Error handling utilities
  export class ClimateApiError extends Error {
    constructor(message: string, public status?: number) {
      super(message)
      this.name = 'ClimateApiError'
    }
  }
  
  export const handleApiError = (error: any): ClimateApiError => {
    if (error instanceof ClimateApiError) {
      return error
    }
    
    if (error.response) {
      return new ClimateApiError(
        `API request failed: ${error.response.status} ${error.response.statusText}`,
        error.response.status
      )
    }
    
    if (error.request) {
      return new ClimateApiError('Network error: Unable to reach the API server')
    }
    
    return new ClimateApiError(`Unexpected error: ${error.message}`)
  }