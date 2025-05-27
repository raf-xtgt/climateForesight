'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import {
  Viewer,
  Ion,
  createWorldTerrainAsync,
  Color,
  GeoJsonDataSource,
  Cartesian3,
  WebMapServiceImageryProvider,
  SingleTileImageryProvider,
  Credit,
  Rectangle,
  Math as CesiumMath,
  Cartesian2,
  NearFarScalar,
  VerticalOrigin,
  HorizontalOrigin,
  LabelStyle,
  DistanceDisplayCondition,
  ImageryLayer
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './cesium-overrides.css'
import countryData from '../../../public/data/country_coordinates.json'
import windArrow from '../../../public/wind-arrow.png'

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

interface GlobeViewerProps {
  onVisualize?: (metric: string, opacity: number, resolution: number) => void
}
interface GlobeMethods {
  visualizeClimate: (metric: string, opacity: number, resolution: number) => void;
}

export const GlobeViewer = forwardRef<GlobeMethods>((props, ref) => {
  const cesiumContainer = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const [activeLayer, setActiveLayer] = useState<ImageryLayer | null>(null)
  const [climateLayer, setClimateLayer] = useState<ImageryLayer | null>(null)


    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      visualizeClimate: async (metric: string, opacity: number, resolution: number) => {
        if (!viewerRef.current) return;
        
        try {
          // Remove previous climate layer if exists
          if (climateLayer) {
            viewerRef.current.imageryLayers.remove(climateLayer);
            URL.revokeObjectURL((climateLayer.imageryProvider as SingleTileImageryProvider).url);
            setClimateLayer(null);
          }
    
          // Special handling for wind (particles)
          if (metric === 'wind-speed') {
            await displayWindParticles(resolution);
            return;
          }
    
          // Fetch heatmap image
          const response = await fetch(
            `http://localhost:5000/api/weather/heatmap/${metric}?width=2048&height=1024&resolution=${resolution}`
          );
          
          if (!response.ok) throw new Error('Failed to fetch climate data');
          
          const data = await response.json();
          const blob = await fetch(data.image).then(res => res.blob());
          const imageUrl = URL.createObjectURL(blob);
          
          // Create single tile provider with required dimensions
          const provider = new SingleTileImageryProvider({
            url: imageUrl,
            rectangle: Rectangle.fromDegrees(-180, -90, 180, 90),
            tileWidth: 2048,  // Must match your image width
            tileHeight: 1024  // Must match your image height
          });
          
          // Add layer to globe
          const layer = viewerRef.current.imageryLayers.addImageryProvider(provider);
          layer.alpha = opacity / 100;
          setClimateLayer(layer);
          
        } catch (error) {
          console.error('Error visualizing climate data:', error);
        }
      }
    }));
  // Function to display wind particles
  const displayWindParticles = async (resolution: number) => {
    if (!viewerRef.current) return
    
    try {
      const response = await fetch(
        `http://localhost:5000/api/weather/wind-particles?resolution=${resolution}&particles=2000`
      )
      const data = await response.json()
      
      // Clear existing particles
      viewerRef.current.entities.removeAll()
      
      // Create wind particles
      data.windData.forEach((point: any) => {
        const position = Cartesian3.fromDegrees(point.lon, point.lat)
        const angle = Math.atan2(point.v, point.u)
        const speed = Math.sqrt(point.u * point.u + point.v * point.v)
        
        viewerRef.current?.entities.add({
          position,
          billboard: {
            image: windArrow.src,
            width: 20,
            height: 20,
            rotation: angle,
            color: Color.fromCssColorString(getWindColor(speed)),
            scale: 0.5 + (speed / 20)
          }
        })
      })
    } catch (error) {
      console.error('Error loading wind data:', error)
    }
  }

  // Helper function to get color based on wind speed
  const getWindColor = (speed: number): string => {
    if (speed < 5) return '#4dac26' // Light green
    if (speed < 10) return '#b8e186' // Green
    if (speed < 15) return '#f1b6da' // Pink
    if (speed < 20) return '#d01c8b' // Purple
    return '#4d9221' // Dark green
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
})
GlobeViewer.displayName = 'GlobeViewer';
export default GlobeViewer;