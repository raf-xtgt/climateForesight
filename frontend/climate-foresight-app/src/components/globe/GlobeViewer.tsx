'use client'

import { useEffect, useRef } from 'react'
import {
  Viewer,
  Ion,
  createWorldTerrainAsync,
  Color,
  GeoJsonDataSource,
  IonImageryProvider,
  buildModuleUrl
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './cesium-overrides.css'
import Cesium from 'cesium'

if (typeof window !== 'undefined') {
  window.CESIUM_BASE_URL = '/cesium/'

  // Set your Ion access token
  const accessToken:string | any = process.env.NEXT_PUBLIC_CESIUM_ACCESS_TOKEN ;

  Ion.defaultAccessToken = accessToken?.toString() // Replace with actual token
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
          timeline: true,
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          vrButton: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: true,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          scene3DOnly: true,
          shouldAnimate: true,
        })

        const geoJson = await GeoJsonDataSource.load(
          'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json',
          {
            stroke: Color.BLACK,
            fill: Color.TRANSPARENT,
            strokeWidth: 2
          }
        )
        viewerRef.current.dataSources.add(geoJson)

        // Optional: fly to an initial location
        const viewer = viewerRef.current
        viewer.camera.flyHome(0)

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
