'use client'

import { useEffect, useRef } from 'react'
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
  DistanceDisplayCondition
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './cesium-overrides.css'
import countryData from '../../../public/data/country_coordinates.json'
import { getClimateData } from '@/services/climateService'
import { ClimateData } from '@/models/climateData'
import { createTemperatureImageryLayer } from './imageryLayers/temperatureImageryLayer'

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

// Add this function inside your GlobeViewer component
const fetchAndRenderClimateData = async (viewer: Viewer) => {
  try {
    // Fetch climate data for all countries
    const response = await getClimateData()
    
    const climateData: ClimateData[] = response.data
    console.log("climateData", climateData)
    // Create temperature visualization
    createTemperatureImageryLayer(viewer, climateData)
    
    // You can add similar heatmaps for other parameters
    // by creating additional entities with different color schemes
    
  } catch (error) {
    console.error('Error fetching climate data:', error)
  }
}


export default function GlobeViewer() {
  const cesiumContainer = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)

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
            stroke: Color.YELLOW.withAlpha(0.3),
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
              font: '45pt sans-serif',
              style: LabelStyle.FILL,
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 1,
              verticalOrigin: VerticalOrigin.CENTER,
              horizontalOrigin: HorizontalOrigin.CENTER,
              pixelOffset: new Cartesian3(0, 0),
              showBackground: true,
              backgroundColor: Color.BLACK.withAlpha(0.5),
              backgroundPadding: new Cartesian2(7, 5),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              // Only show label when camera is within 5M to 500k meters
              distanceDisplayCondition: new DistanceDisplayCondition(500000, 5000000),
              // Scale down when zooming out
              scale: 0.7,
              scaleByDistance: new NearFarScalar(500000, 1.0, 5000000, 0.5)            }
          })
        })

        fetchAndRenderClimateData(viewerRef.current)


        // Add event listener to handle zoom changes
        viewer.scene.postRender.addEventListener(() => {
          const zoom = viewer.camera.positionCartographic.height
          entities.show = zoom < 8000000 // Hide all labels when zoomed out too far
        })

      } catch (error) {
        console.error('Failed to initialize Cesium viewer:', error)
      }
    }

    initializeViewer()

    return () => {
      viewerRef.current?.destroy()
      viewerRef.current = null
    }
  }, [])

  return <div ref={cesiumContainer} className="w-full h-full" />
}