// Updated imports
import {
  Viewer,
  ImageryProvider,
  SingleTileImageryProvider,
  Rectangle,
  Color
} from 'cesium';
import { ClimateData } from '@/models/climateData';
import { addColorLegend } from './colorLegend'

// Updated createTemperatureImageryLayer function
export const createTemperatureImageryLayer = async (viewer: Viewer, climateData: ClimateData[]) => {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  
  // Find min/max temperatures
  const minTemp = Math.min(...climateData.map(d => d.temperature));
  const maxTemp = Math.max(...climateData.map(d => d.temperature));
  
  // Draw heatmap
  climateData.forEach(data => {
    const x = Math.floor((data.coordinates.longitude + 180) * (canvas.width / 360));
    const y = Math.floor((90 - data.coordinates.latitude) * (canvas.height / 180));
    
    const ratio = (data.temperature - minTemp) / (maxTemp - minTemp);
    const hue = (1 - ratio) * 240; // Blue to red
    ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.5 + ratio * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y, 5 + ratio * 10, 0, Math.PI * 2);
    ctx.fill();
  });

  try {
    // Create imagery provider with required options
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
          tileWidth: canvas.width,  // Required parameter
          tileHeight: canvas.height // Required parameter
        }));
      }, 'image/png');
    });

    // Add to viewer
    viewer.imageryLayers.addImageryProvider(provider);
    
    // Add color legend
    addColorLegend(viewer, minTemp, maxTemp);
    
    return provider;
  } catch (error) {
    console.error('Error creating imagery layer:', error);
    throw error;
  }
};