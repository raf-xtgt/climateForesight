'use client'

import { useEffect, useRef } from 'react'
import { Viewer, Terrain, Ion } from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './cesium-overrides.css'

// Configure Cesium base URL and Ion token
if (typeof window !== 'undefined') {
  // Set the base URL for Cesium assets
  window.CESIUM_BASE_URL = '/cesium/'
  
  // Optional: Set your Ion access token if you have one
  // Ion.defaultAccessToken = 'your_ion_access_token_here'
}

export default function GlobeViewer() {
  const cesiumContainer = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)

  useEffect(() => {
    if (!cesiumContainer.current || viewerRef.current) return

    const initializeViewer = async () => {
      try {
        // Use a simpler terrain approach to avoid loading issues
        let terrain
        try {
          terrain = await Terrain.fromWorldTerrain()
        } catch (terrainError) {
          console.warn('Failed to load world terrain, using default:', terrainError)
          terrain = undefined // Will use default ellipsoid
        }

        viewerRef.current = new Viewer(cesiumContainer.current!, {
          terrain,
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          vrButton: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          scene3DOnly: true,
          shouldAnimate: true,
        })

        // Optional: Remove default imagery layer if you want a blank globe
        // viewerRef.current.imageryLayers.remove(viewerRef.current.imageryLayers.get(0), true)

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