import {
  Viewer,
  ImageryProvider,
  SingleTileImageryProvider,
  Rectangle,
  Color,
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

// Create a heatmap texture using Delaunay triangulation
const createHeatmapTexture = async (climateData: ClimateData[], width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;
  
  // Prepare data with proper typing
  const points: [number, number][] = climateData.map(d => [
    ((d.coordinates.longitude + 180) / 360) * width,
    ((90 - d.coordinates.latitude) / 180) * height
  ]);
  
  const values = climateData.map(d => d.temperature);
  const minTemp = Math.min(...values);
  const maxTemp = Math.max(...values);
  
  // Create Delaunay triangulation with proper typing
  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi([0, 0, width, height]);
  
  // Create image data for direct pixel manipulation
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // For each pixel in the canvas
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Find the nearest data point
      const i = delaunay.find(x, y);
      const temp = values[i];
      
      // Get color for this temperature
      const color = getTemperatureColor(temp, minTemp, maxTemp);
      
      // Set pixel color
      const idx = (y * width + x) * 4;
      data[idx] = color.red * 255;     // R
      data[idx + 1] = color.green * 255; // G
      data[idx + 2] = color.blue * 255;  // B
      data[idx + 3] = color.alpha * 255; // A
    }
  }
  
  // Apply blur for smoother transitions
  ctx.putImageData(imageData, 0, 0);
  ctx.filter = 'blur(8px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';
  
  return { canvas, minTemp, maxTemp };
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