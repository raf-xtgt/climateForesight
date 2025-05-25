import {
  Viewer,
  ImageryProvider,
  SingleTileImageryProvider,
  Rectangle,
  GeoJsonDataSource,
  Color,
  JulianDate,
  Cartographic,
  Cartesian2,
  Cartesian3,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Math as CesiumMath,
  LabelStyle,
  Entity
} from 'cesium';
import { ClimateData } from '@/models/climateData';
import { addColorLegend } from './colorLegend';
import { Delaunay } from 'd3-delaunay';


interface TemperatureLayerResult {
  provider: ImageryProvider;
  handler: ScreenSpaceEventHandler;
  minTemp: number;
  maxTemp: number;
}

const interpolateColor = (color1: Color, ratio: number, color2: Color): Color => {
  // Extract RGBA components
  const r1 = color1.red;
  const g1 = color1.green;
  const b1 = color1.blue;
  const a1 = color1.alpha;

  const r2 = color2.red;
  const g2 = color2.green;
  const b2 = color2.blue;
  const a2 = color2.alpha;

  // Interpolate each channel
  return new Color(
    r1 * (1 - ratio) + r2 * ratio,
    g1 * (1 - ratio) + g2 * ratio,
    b1 * (1 - ratio) + b2 * ratio,
    a1 * (1 - ratio) + a2 * ratio
  );
};

const getTemperatureColor = (temp: number, minTemp: number, maxTemp: number): Color => {
  const ratio = Math.min(1, Math.max(0, (temp - minTemp) / (maxTemp - minTemp)));
  
  // Define colors in RGBA format
  const coldColor = new Color(0.0, 0.0, 1.0, 0.8);    // Blue
  const warmColor = new Color(0.0, 1.0, 0.0, 0.8);    // Green
  const hotColor = new Color(1.0, 0.0, 0.0, 0.8);     // Red
  
  if (ratio < 0.5) {
    return interpolateColor(coldColor, ratio * 2, warmColor);
  } else {
    return interpolateColor(warmColor, (ratio - 0.5) * 2, hotColor);
  }
};

type Point = [number, number];

// Create a heatmap texture using Delaunay triangulation
const createHeatmapTexture = async (climateData: ClimateData[], width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Create a landmask (white=land, black=water)
  const landmask = await createLandmask(width, height);
  
  // Create typed points array
  const points: Point[] = climateData.map(d => [
    ((d.coordinates.longitude + 180) / 360) * width,
    ((90 - d.coordinates.latitude) / 180) * height
  ] as Point); // Explicitly type as Point

  const values = climateData.map(d => d.temperature);
  const minTemp = Math.min(...values);
  const maxTemp = Math.max(...values);
  const delaunay = Delaunay.from(points);
  
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Only render if this is land (white in landmask)
      if (landmask.data[idx] > 128) {
        const i = delaunay.find(x, y);
        const temp = values[i];
        const color = getTemperatureColor(temp, minTemp, maxTemp);
        
        data[idx] = color.red * 255;
        data[idx + 1] = color.green * 255;
        data[idx + 2] = color.blue * 255;
        data[idx + 3] = color.alpha * 255;
      } else {
        // Transparent for water areas
        data[idx + 3] = 0;
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return { canvas, minTemp, maxTemp };
};


const createLandmask = async (width: number, height: number): Promise<ImageData> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Use Cesium's built-in land polygon data
  const geoJson = await GeoJsonDataSource.load(
    'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'
  );
  
  // Draw white land areas on black background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  
  geoJson.entities.values.forEach((entity:any) => {
    if (entity.polygon) {
      const positions = entity.polygon.hierarchy.getValue(JulianDate.now()).positions;
      const coords = positions.map((pos:any) => {
        const carto = Cartographic.fromCartesian(pos);
        return [
          ((carto.longitude + Math.PI) / (2 * Math.PI)) * width,
          ((Math.PI/2 - carto.latitude) / Math.PI) * height
        ] as [number, number];
      });
      
      ctx.beginPath();
      coords.forEach(([x, y]: [number, number], i: number) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
    }
  });
  
  return ctx.getImageData(0, 0, width, height);
};

export const createTemperatureImageryLayer = async (viewer: Viewer, climateData: ClimateData[]) : Promise<TemperatureLayerResult> => {
  try {
    // Create a high-resolution heatmap texture (higher resolution for better quality)
    const { canvas, minTemp, maxTemp } = await createHeatmapTexture(climateData, 4096, 2048);
    
    // Create imagery provider
    // In temperatureImageryLayer.tsx
    const provider = await new Promise<ImageryProvider>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create canvas blob'));
          return;
        }
    
        const url = URL.createObjectURL(blob);
        resolve(new SingleTileImageryProvider({
          url: url,
          rectangle: Rectangle.fromDegrees(-180, -90, 180, 90),
          tileWidth: canvas.width,  // Add this required parameter
          tileHeight: canvas.height // Add this required parameter
        }));
      }, 'image/png');
    });

    // Add to viewer
    const imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
    
    // Make sure the layer is above base imagery but below labels
    viewer.imageryLayers.raiseToTop(imageryLayer);
    
    // Add color legend
    addColorLegend(viewer, minTemp, maxTemp);
    
    // Add click handler to show temperature
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: { position: Cartesian2 }) => {
      const position = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
      if (position) {
        const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(position);
        const longitude = CesiumMath.toDegrees(cartographic.longitude);
        const latitude = CesiumMath.toDegrees(cartographic.latitude);

        // Find the nearest data point
        let closestPoint: ClimateData | null = null;
        let minDistance = Infinity;
        
        for (const point of climateData) {
          const distance = Math.sqrt(
            Math.pow(point.coordinates.longitude - longitude, 2) + 
            Math.pow(point.coordinates.latitude - latitude, 2)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
          }
        }
        
        if (closestPoint) {
          viewer.selectedEntity = new Entity({
            position: Cartesian3.fromDegrees(
              closestPoint.coordinates.longitude,
              closestPoint.coordinates.latitude
            ),
            label: {
              text: `Temperature: ${closestPoint.temperature.toFixed(1)}°C`,
              font: '14pt sans-serif',
              style: LabelStyle.FILL_AND_OUTLINE,
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 1,
              pixelOffset: new Cartesian2(0, -20),
              showBackground: true,
              backgroundColor: Color.BLACK.withAlpha(0.7)
            }
          });
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    
    return {
      provider,
      handler,
      minTemp,
      maxTemp
    };
  } catch (error) {
    console.error('Error creating temperature imagery layer:', error);
    throw error;
  }
};