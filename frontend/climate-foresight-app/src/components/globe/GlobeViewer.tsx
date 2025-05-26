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

    // In GlobeViewer.tsx cleanup
    return () => {
      if (viewerRef.current) {
        // Revoke any blob URLs used by imagery providers
        viewerRef.current.imageryLayers.removeAll();
      }
      viewerRef.current?.destroy();
      viewerRef.current = null;
    }
  }, [])

  return <div ref={cesiumContainer} className="w-full h-full" />
}