'use client'

import { useState } from 'react'
import GlobeViewerV2 from './globe/GlobalViewerV2'

type VisualizationType = 'temperature' | 'humidity' | 'windSpeed' | 'precipitation' | 'sunlight'

interface VisualizationOption {
  id: VisualizationType
  label: string
  description: string
  icon: string
  color: string
}

const visualizationOptions: VisualizationOption[] = [
  {
    id: 'temperature',
    label: 'Temperature',
    description: 'Surface temperature in Celsius',
    icon: '🌡️',
    color: 'from-blue-500 to-red-500'
  },
  {
    id: 'humidity',
    label: 'Humidity',
    description: 'Relative humidity percentage',
    icon: '💧',
    color: 'from-yellow-400 to-blue-600'
  },
  {
    id: 'windSpeed',
    label: 'Wind Speed',
    description: 'Wind speed in meters per second',
    icon: '💨',
    color: 'from-green-400 to-red-500'
  },
  {
    id: 'precipitation',
    label: 'Precipitation',
    description: 'Rainfall in millimeters',
    icon: '🌧️',
    color: 'from-gray-300 to-blue-600'
  },
  {
    id: 'sunlight',
    label: 'Solar Radiation',
    description: 'Shortwave radiation in W/m²',
    icon: '☀️',
    color: 'from-purple-500 to-yellow-400'
  }
]

export default function ClimateVisualizationApp() {
  const [selectedVisualization, setSelectedVisualization] = useState<VisualizationType>('temperature')
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(true)

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Main Globe Viewer */}
      <GlobeViewerV2 visualizationType={selectedVisualization} />
      
      {/* Control Panel Toggle */}
      <button
        onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}
        className="absolute top-4 left-4 z-50 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg shadow-lg transition-colors"
        title="Toggle Control Panel"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Control Panel */}
      <div className={`absolute top-0 left-0 h-full bg-gray-800 bg-opacity-95 text-white transition-transform duration-300 z-40 ${
        isControlPanelOpen ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ width: '350px' }}>
        
        <div className="p-6 h-full overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Climate Visualizer</h1>
            <p className="text-gray-300 text-sm">
              Explore global climate data in real-time 3D visualization
            </p>
          </div>

          {/* Visualization Options */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b border-gray-600 pb-2">
              Data Layers
            </h2>
            
            {visualizationOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => setSelectedVisualization(option.id)}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                  selectedVisualization === option.id
                    ? 'border-blue-500 bg-blue-500 bg-opacity-20'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <h3 className="font-medium">{option.label}</h3>
                  </div>
                </div>
                <p className="text-sm text-gray-300">{option.description}</p>
                
                {/* Color gradient indicator */}
                <div className={`mt-2 h-2 rounded bg-gradient-to-r ${option.color}`}></div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold border-b border-gray-600 pb-2 mb-4">
              Legend
            </h2>
            
            <div className="space-y-3 text-sm">
              {selectedVisualization === 'temperature' && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Cold</span>
                    <span>Hot</span>
                  </div>
                  <div className="h-4 rounded bg-gradient-to-r from-blue-500 via-cyan-400 via-yellow-400 to-red-500"></div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>-40°C</span>
                    <span>50°C</span>
                  </div>
                </div>
              )}
              
              {selectedVisualization === 'humidity' && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Dry</span>
                    <span>Humid</span>
                  </div>
                  <div className="h-4 rounded bg-gradient-to-r from-yellow-400 to-blue-600"></div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
              
              {selectedVisualization === 'windSpeed' && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Calm</span>
                    <span>Windy</span>
                  </div>
                  <div className="h-4 rounded bg-gradient-to-r from-green-400 via-orange-400 to-red-500"></div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0 m/s</span>
                    <span>30+ m/s</span>
                  </div>
                </div>
              )}
              
              {selectedVisualization === 'precipitation' && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span>No Rain</span>
                    <span>Heavy Rain</span>
                  </div>
                  <div className="h-4 rounded bg-gradient-to-r from-gray-300 to-blue-600"></div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0 mm</span>
                    <span>10+ mm</span>
                  </div>
                </div>
              )}
              
              {selectedVisualization === 'sunlight' && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                  <div className="h-4 rounded bg-gradient-to-r from-purple-500 via-blue-400 via-yellow-400 to-orange-400"></div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0 W/m²</span>
                    <span>1000 W/m²</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold border-b border-gray-600 pb-2 mb-4">
              Instructions
            </h2>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• Use mouse to rotate and zoom the globe</p>
              <p>• Click on data points to see detailed information</p>
              <p>• Switch between different climate layers above</p>
              <p>• Larger points indicate higher intensity values</p>
            </div>
          </div>

          {/* Data Info */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold border-b border-gray-600 pb-2 mb-4">
              Data Source
            </h2>
            <div className="text-sm text-gray-300">
              <p className="mb-2">
                Climate data provided by <strong>Open-Meteo API</strong>
              </p>
              <p className="text-xs">
                Data is updated regularly and represents current weather conditions 
                and forecasts from meteorological services worldwide.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isControlPanelOpen && (
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsControlPanelOpen(false)}
        />
      )}
    </div>
  )
}