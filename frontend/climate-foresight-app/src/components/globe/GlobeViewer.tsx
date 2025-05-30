'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import {
  Viewer,
  Ion,
  createWorldTerrainAsync,
  Color,
  GeoJsonDataSource,
  Cartesian3,
  SingleTileImageryProvider,
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
// import citiesData from '../../../public/data/city_coordinates.json'
import windArrow from '../../../public/wind-arrow.png'
import ClimateLegend from './ClimateLegend'
import Timeline from './Timeline'

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

// interface CityData {
//   city: string
//   latitude: number
//   longitude: number
// }
// const typedCitiesData = citiesData as CityData[];

interface LegendConfig {
  variable: string
  unit: string
  items: {
    color: string
    label: string
  }[]
}

interface HourlyData {
  hour: number
  formatted_time: string
  timestamp: string
  image: string
}

interface GlobeMethods {
  visualizeClimate: (metric: string, opacity: number, resolution: number) => void;
  setHourlyData: (data: HourlyData[]) => void;
  setCurrentHour: (hour: number) => void;
}

export const GlobeViewer = forwardRef<GlobeMethods>((props, ref) => {
  const cesiumContainer = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const [activeLayer, setActiveLayer] = useState<ImageryLayer | null>(null)
  const [climateLayer, setClimateLayer] = useState<ImageryLayer | null>(null)
  const [legendConfig, setLegendConfig] = useState<LegendConfig | null>(null)
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [currentHour, setCurrentHour] = useState(0)
  const [currentOpacity, setCurrentOpacity] = useState(70); // Default opacity

  const getLegendConfig = (variable: string) => {
    const legends: Record<string, LegendConfig> = {
      temperature: {
        variable: 'Temperature',
        unit: '°C',
        items: [
          { color: '#0000FF', label: '< -10°C' },
          { color: '#00AAFF', label: '-10°C to 0°C' },
          { color: '#00FFAA', label: '0°C to 10°C' },
          { color: '#FFFF00', label: '10°C to 20°C' },
          { color: '#FF8000', label: '20°C to 30°C' },
          { color: '#FF0000', label: '> 30°C' }
        ]
      },
      precipitation: {
        variable: 'Rainfall',
        unit: 'mm',
        items: [
          { color: '#E6F7FF', label: '0-2 mm' },
          { color: '#BAE7FF', label: '2-5 mm' },
          { color: '#91D5FF', label: '5-10 mm' },
          { color: '#69C0FF', label: '10-20 mm' },
          { color: '#40A9FF', label: '20-50 mm' },
          { color: '#1890FF', label: '> 50 mm' }
        ]
      },
      sunlight: {
        variable: 'Sunlight',
        unit: 'W/m²',
        items: [
          { color: '#FFF7E6', label: '0-200' },
          { color: '#FFE7BA', label: '200-400' },
          { color: '#FFD591', label: '400-600' },
          { color: '#FFC069', label: '600-800' },
          { color: '#FFA940', label: '800-1000' },
          { color: '#FF8C00', label: '> 1000' }
        ]
      },
      humidity: {
        variable: 'Humidity',
        unit: '%',
        items: [
          { color: '#1414FF', label: '0-20%' },       // Dark blue
          { color: '#4B4BFF', label: '20-40%' },      // Medium blue
          { color: '#8282FF', label: '40-60%' },      // Light blue
          { color: '#B9B9FF', label: '60-80%' },      // Very light blue
          { color: '#E6E6FF', label: '80-90%' },      // Pale blue
          { color: '#FFFFFF', label: '90-100%' }      // White
        ]
      },
      'wind-speed': {
        variable: 'Wind Speed',
        unit: 'm/s',
        items: [
          { color: '#4dac26', label: '0-5 m/s' },
          { color: '#b8e186', label: '5-10 m/s' },
          { color: '#f1b6da', label: '10-15 m/s' },
          { color: '#d01c8b', label: '15-20 m/s' },
          { color: '#4d9221', label: '> 20 m/s' }
        ]
      }
    }
  
    return legends[variable] || null
  }


    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      visualizeClimate: async (metric: string, opacity: number, resolution: number) => {
        if (!viewerRef.current) return;
        setCurrentOpacity(opacity); // Store the opacity
    
        try {
          // Remove previous climate layer if exists
          if (climateLayer) {
            viewerRef.current.imageryLayers.remove(climateLayer);
            if ((climateLayer.imageryProvider as SingleTileImageryProvider).url) {
              URL.revokeObjectURL((climateLayer.imageryProvider as SingleTileImageryProvider).url);
            }
            setClimateLayer(null);
          }
    
          // Special handling for wind (particles)
          if (metric === 'wind-speed') {
            await displayWindParticles(resolution);
            setHourlyData([]); // Clear hourly data for wind
            return;
          }
    
          // Always use the hourly endpoint
          const hourlyResponse = await fetch(
            `http://localhost:5000/api/weather/heatmap-with-timestamps/v2/${metric}?width=2048&height=1024&resolution=${resolution}`
          );
          
          if (!hourlyResponse.ok) throw new Error('Failed to fetch climate data');
          
          const hourlyJson = await hourlyResponse.json();
          setHourlyData(hourlyJson.hourly_data);
          
          // Set to current hour or first available hour
          const currentHour = new Date().getHours();
          const initialHour = hourlyJson.hourly_data.find((h: any) => h.hour === currentHour) ? 
                             currentHour : 
                             hourlyJson.hourly_data[0]?.hour || 0;
          setCurrentHour(initialHour);
    
          // Immediately display the initial hour's data
          const hourData = hourlyJson.hourly_data.find((h: any) => h.hour === initialHour);
          if (hourData) {
            const blob = await fetch(hourData.image).then(res => res.blob());
            const imageUrl = URL.createObjectURL(blob);
            
            const provider = new SingleTileImageryProvider({
              url: imageUrl,
              rectangle: Rectangle.fromDegrees(-180, -90, 180, 90),
              tileWidth: 2048,
              tileHeight: 1024
            });
            
            const layer = viewerRef.current.imageryLayers.addImageryProvider(provider);
            layer.alpha = opacity / 100;
            setClimateLayer(layer);
            setLegendConfig(getLegendConfig(metric));
          }
        } catch (error) {
          console.error('Error visualizing climate data:', error);
        }
      },
      setHourlyData: (data: HourlyData[]) => {
        setHourlyData(data);
      },
      setCurrentHour: (hour: number) => {
        setCurrentHour(hour);
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

        // typedCitiesData.forEach((city: CityData) => {
        //   const position = Cartesian3.fromDegrees(
        //     city.longitude,
        //     city.latitude
        //   )
          
        //   entities.add({
        //     position,
        //     label: {
        //       text: city.city,
        //       font: '45pt sans-serif',
        //       style: LabelStyle.FILL,
        //       fillColor: Color.WHITE,
        //       outlineColor: Color.BLACK,
        //       outlineWidth: 1,
        //       verticalOrigin: VerticalOrigin.CENTER,
        //       horizontalOrigin: HorizontalOrigin.CENTER,
        //       pixelOffset: new Cartesian3(0, 0),
        //       showBackground: true,
        //       backgroundColor: Color.BLACK.withAlpha(0.5),
        //       backgroundPadding: new Cartesian2(7, 5),
        //       disableDepthTestDistance: Number.POSITIVE_INFINITY,
        //       // Only show label when camera is within 5M to 500k meters
        //       distanceDisplayCondition: new DistanceDisplayCondition(5000, 50000),
        //       // Scale down when zooming out
        //       scale: 0.7,
        //       scaleByDistance: new NearFarScalar(5000, 1.0, 50000, 0.5)            }
        //   })
        // })



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

  useEffect(() => {
    const updateClimateLayer = async () => {
      if (!viewerRef.current || !hourlyData.length) return;

      const hourData = hourlyData.find(h => h.hour === currentHour);
      if (!hourData) return;

      try {
        // Remove previous layer if exists
        if (climateLayer) {
          viewerRef.current.imageryLayers.remove(climateLayer);
          if ((climateLayer.imageryProvider as SingleTileImageryProvider).url) {
            URL.revokeObjectURL((climateLayer.imageryProvider as SingleTileImageryProvider).url);
          }
          setClimateLayer(null);
        }

        const blob = await fetch(hourData.image).then(res => res.blob());
        const imageUrl = URL.createObjectURL(blob);

        const provider = new SingleTileImageryProvider({
          url: imageUrl,
          rectangle: Rectangle.fromDegrees(-180, -90, 180, 90),
          tileWidth: 2048,
          tileHeight: 1024
        });

        const layer = viewerRef.current.imageryLayers.addImageryProvider(provider);
        if (layer) {
          layer.alpha = currentOpacity / 100;
          setClimateLayer(layer);
        }
      } catch (error) {
        console.error('Error updating climate layer:', error);
      }
    };

    updateClimateLayer();
  }, [currentHour, hourlyData, currentOpacity]);

  return (
    <div ref={cesiumContainer} className="w-full h-full relative" >
      {legendConfig && <ClimateLegend {...legendConfig} />}
      {hourlyData.length > 0 && (
        <Timeline 
          onTimeChange={setCurrentHour}
          currentHour={currentHour}
          hours={hourlyData}
        />
      )}
    </div>
  )
})
GlobeViewer.displayName = 'GlobeViewer';
export default GlobeViewer;