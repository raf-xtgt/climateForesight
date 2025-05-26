'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Viewer,
  Ion,
  createWorldTerrainAsync,
  Color,
  GeoJsonDataSource,
  Cartesian3,
  Entity,
  Cartesian2,
  NearFarScalar,
  VerticalOrigin,
  HorizontalOrigin,
  LabelStyle,
  DistanceDisplayCondition,
  PointPrimitive,
  PointPrimitiveCollection,
  BillboardCollection,
  Billboard,
  HeightReference,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Math as CesiumMath
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './cesium-overrides.css'
import countryData from '../../../public/data/country_coordinates.json'

if (typeof window !== 'undefined') {
  window.CESIUM_BASE_URL = '/cesium/'
  const accessToken: string | any = process.env.NEXT_PUBLIC_CESIUM_ACCESS_TOKEN
  Ion.defaultAccessToken = accessToken?.toString()
}

interface CountryData {
  country: string
  latitude: number
  longitude: number
}

interface ClimateData {
  lat: number
  lon: number
  temperature: number
  humidity: number
  windSpeed: number
  precipitation: number
  sunlight: number
}

interface ClimateVisualizationProps {
  visualizationType: 'temperature' | 'humidity' | 'windSpeed' | 'precipitation' | 'sunlight'
}

export default function GlobeViewerV2({ visualizationType = 'temperature' }: ClimateVisualizationProps) {
  const cesiumContainer = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const [climateData, setClimateData] = useState<ClimateData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pointCollectionRef = useRef<PointPrimitiveCollection | null>(null)

  // Fetch climate data
  const fetchClimateData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:5000/api/weather/global?sample=true')
      if (!response.ok) {
        throw new Error('Failed to fetch climate data')
      }
      const result = await response.json()
      setClimateData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching climate data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Color mapping functions
  const getTemperatureColor = (temp: number): Color => {
    // Temperature range: -40°C to 50°C
    const normalized = Math.max(0, Math.min(1, (temp + 40) / 90))
    if (normalized < 0.25) return Color.BLUE.withAlpha(0.8)
    if (normalized < 0.5) return Color.CYAN.withAlpha(0.8)
    if (normalized < 0.75) return Color.YELLOW.withAlpha(0.8)
    return Color.RED.withAlpha(0.8)
  }

  const getHumidityColor = (humidity: number): Color => {
    // Humidity range: 0% to 100%
    const normalized = humidity / 100
    return Color.BLUE.withAlpha(normalized * 0.8 + 0.2)
  }

  const getWindSpeedColor = (windSpeed: number): Color => {
    // Wind speed range: 0 to 30 m/s
    const normalized = Math.min(1, windSpeed / 30)
    if (normalized < 0.33) return Color.GREEN.withAlpha(0.8)
    if (normalized < 0.66) return Color.ORANGE.withAlpha(0.8)
    return Color.RED.withAlpha(0.8)
  }

  const getPrecipitationColor = (precipitation: number): Color => {
    // Precipitation range: 0 to 10mm
    const normalized = Math.min(1, precipitation / 10)
    return Color.BLUE.withAlpha(normalized * 0.8 + 0.2)
  }

  const getSunlightColor = (sunlight: number): Color => {
    // Sunlight range: 0 to 1000 W/m²
    const normalized = sunlight / 1000
    if (normalized < 0.25) return Color.PURPLE.withAlpha(0.8)
    if (normalized < 0.5) return Color.BLUE.withAlpha(0.8)
    if (normalized < 0.75) return Color.YELLOW.withAlpha(0.8)
    return Color.ORANGE.withAlpha(0.8)
  }

  const getColorForVisualization = (data: ClimateData, type: string): Color => {
    switch (type) {
      case 'temperature': return getTemperatureColor(data.temperature)
      case 'humidity': return getHumidityColor(data.humidity)
      case 'windSpeed': return getWindSpeedColor(data.windSpeed)
      case 'precipitation': return getPrecipitationColor(data.precipitation)
      case 'sunlight': return getSunlightColor(data.sunlight)
      default: return Color.WHITE
    }
  }

  const getValueForVisualization = (data: ClimateData, type: string): number => {
    switch (type) {
      case 'temperature': return data.temperature
      case 'humidity': return data.humidity
      case 'windSpeed': return data.windSpeed
      case 'precipitation': return data.precipitation
      case 'sunlight': return data.sunlight
      default: return 0
    }
  }

  const getUnitForVisualization = (type: string): string => {
    switch (type) {
      case 'temperature': return '°C'
      case 'humidity': return '%'
      case 'windSpeed': return 'm/s'
      case 'precipitation': return 'mm'
      case 'sunlight': return 'W/m²'
      default: return ''
    }
  }

  // Update visualization when data or type changes
  const updateVisualization = () => {
    if (!viewerRef.current || !climateData.length) return

    const viewer = viewerRef.current
    
    // Remove existing points
    if (pointCollectionRef.current) {
      viewer.scene.primitives.remove(pointCollectionRef.current)
    }

    // Create new point collection
    const pointCollection = new PointPrimitiveCollection()
    pointCollectionRef.current = pointCollection

    // Add climate data points
    climateData.forEach((data) => {
      const position = Cartesian3.fromDegrees(data.lon, data.lat, 0)
      const color = getColorForVisualization(data, visualizationType)
      const value = getValueForVisualization(data, visualizationType)
      
      // Scale point size based on value intensity
      let pixelSize = 8
      if (visualizationType === 'temperature') {
        pixelSize = 6 + Math.abs(data.temperature) / 10
      } else if (visualizationType === 'windSpeed') {
        pixelSize = 6 + data.windSpeed / 3
      } else if (visualizationType === 'precipitation') {
        pixelSize = 6 + data.precipitation * 2
      }

      pointCollection.add({
        position,
        color,
        pixelSize: Math.min(pixelSize, 15),
        outlineColor: Color.BLACK,
        outlineWidth: 1,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      })
    })

    viewer.scene.primitives.add(pointCollection)

    // Add click handler for climate data
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((event: any) => {
      const pickedObject = viewer.scene.pick(event.position)
      if (defined(pickedObject) && pickedObject.primitive === pointCollection) {
        // Find closest climate data point
        const cartesian = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid)
        if (cartesian) {
          const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian)
          const longitude = CesiumMath.toDegrees(cartographic.longitude)
          const latitude = CesiumMath.toDegrees(cartographic.latitude)
          
          // Find nearest data point
          let nearestData = climateData[0]
          let minDistance = Number.MAX_VALUE
          
          climateData.forEach((data) => {
            const distance = Math.sqrt(
              Math.pow(data.lat - latitude, 2) + Math.pow(data.lon - longitude, 2)
            )
            if (distance < minDistance) {
              minDistance = distance
              nearestData = data
            }
          })

          // Show info popup (you can customize this)
          const unit = getUnitForVisualization(visualizationType)
          const value = getValueForVisualization(nearestData, visualizationType)
          
          console.log(`Climate Data at (${nearestData.lat}, ${nearestData.lon}):`)
          console.log(`${visualizationType}: ${value}${unit}`)
          console.log(`Temperature: ${nearestData.temperature}°C`)
          console.log(`Humidity: ${nearestData.humidity}%`)
          console.log(`Wind Speed: ${nearestData.windSpeed}m/s`)
          console.log(`Precipitation: ${nearestData.precipitation}mm`)
          console.log(`Sunlight: ${nearestData.sunlight}W/m²`)
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK)
  }

  useEffect(() => {
    if (!cesiumContainer.current || viewerRef.current) return

    const initializeViewer = async () => {
      try {
        const terrainProvider = await createWorldTerrainAsync()

        viewerRef.current = new Viewer(cesiumContainer.current!, {
          terrainProvider,
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: true,
          vrButton: false,
          homeButton: true,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          scene3DOnly: true,
        })

        // Load country borders with reduced opacity
        const geoJson = await GeoJsonDataSource.load(
          'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json',
          {
            stroke: Color.YELLOW.withAlpha(0.2),
            fill: Color.TRANSPARENT,
            strokeWidth: 0.5
          }
        )
        viewerRef.current.dataSources.add(geoJson)

        // Add country labels with distance-based visibility
        const viewer = viewerRef.current
        const entities = viewer.entities

        countryData.forEach((country: CountryData) => {
          const position = Cartesian3.fromDegrees(
            country.longitude,
            country.latitude
          )
          
          entities.add({
            position,
            label: {
              text: country.country,
              font: '12pt sans-serif',
              style: LabelStyle.FILL,
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 1,
              verticalOrigin: VerticalOrigin.CENTER,
              horizontalOrigin: HorizontalOrigin.CENTER,
              pixelOffset: new Cartesian3(0, 0),
              showBackground: true,
              backgroundColor: Color.BLACK.withAlpha(0.7),
              backgroundPadding: new Cartesian2(5, 3),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              distanceDisplayCondition: new DistanceDisplayCondition(1000000, 8000000),
              scale: 0.8,
              scaleByDistance: new NearFarScalar(1000000, 1.0, 8000000, 0.3)
            }
          })
        })

        // Fetch climate data after viewer is initialized
        fetchClimateData()

      } catch (error) {
        console.error('Failed to initialize Cesium viewer:', error)
        setError('Failed to initialize 3D viewer')
      }
    }

    initializeViewer()

    return () => {
      if (pointCollectionRef.current && viewerRef.current) {
        viewerRef.current.scene.primitives.remove(pointCollectionRef.current)
      }
      if (viewerRef.current) {
        viewerRef.current.imageryLayers.removeAll()
      }
      viewerRef.current?.destroy()
      viewerRef.current = null
    }
  }, [])

  // Update visualization when climate data or visualization type changes
  useEffect(() => {
    updateVisualization()
  }, [climateData, visualizationType])

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error Loading Climate Data</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button 
            onClick={fetchClimateData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={cesiumContainer} className="w-full h-full" />
      
      {loading && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded">
          Loading climate data...
        </div>
      )}
      
      {climateData.length > 0 && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded">
          <div className="text-sm">
            <div>Visualizing: <strong>{visualizationType}</strong></div>
            <div>Data points: <strong>{climateData.length}</strong></div>
            <div className="text-xs mt-1 text-gray-300">
              Click on points for details
            </div>
          </div>
        </div>
      )}
    </div>
  )
}