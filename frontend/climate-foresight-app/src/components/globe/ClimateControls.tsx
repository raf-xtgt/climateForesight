'use client'

import { useState, useEffect } from 'react'
import {
  NativeSelectField,
  NativeSelectRoot,
  Stack,
  Heading,
  Box,
  Button,
  VStack,
  Text,
  Slider,
  SliderTrack,
  SliderThumb,
  Tooltip
} from '@chakra-ui/react'

interface ClimateControlsProps {
  onVisualize: (metric: string, opacity: number, resolution: number) => void
  onReset: () => void
}

export default function ClimateControls({ onVisualize, onReset }: ClimateControlsProps) {
  const [selectedMetric, setSelectedMetric] = useState('temperature')
  const [opacity, setOpacity] = useState(70)
  const [resolution, setResolution] = useState(5)
  const [showTooltip, setShowTooltip] = useState(false)

  const climateMetrics = [
    { value: 'temperature', label: 'Temperature' },
    { value: 'rainfall', label: 'Rainfall' },
    { value: 'sunlight', label: 'Sunlight' },
    { value: 'humidity', label: 'Humidity' },
    { value: 'wind-speed', label: 'Wind Speed' },
  ]

  const handleVisualize = () => {
    onVisualize(selectedMetric, opacity, resolution)
  }

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="md" color="white" mb={4}>
          Climate Controls
        </Heading>
        <Text color="whiteAlpha.800" fontSize="sm">
          Select a climate metric to visualize on the globe
        </Text>
      </Box>
      
      <Box>
        <Text color="white" fontSize="sm" mb={2} fontWeight="medium">
          Metric Type
        </Text>
        <NativeSelectRoot>
          <NativeSelectField
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            bg="rgba(255, 255, 255, 0.1)"
            border="1px solid rgba(255, 255, 255, 0.2)"
            color="white"
            _focus={{
              borderColor: 'blue.300',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-300)'
            }}
          >
            {climateMetrics.map((metric) => (
              <option 
                key={metric.value} 
                value={metric.value}
                style={{ backgroundColor: '#2D3748', color: 'white' }}
              >
                {metric.label}
              </option>
            ))}
          </NativeSelectField>
        </NativeSelectRoot>
      </Box>

      <VStack gap={3} align="stretch">
        <Button
          colorScheme="blue"
          variant="solid"
          size="sm"
          bg="rgba(255, 255, 255, 0.2)"
          color="white"
          _hover={{ bg: 'rgba(255, 255, 255, 0.3)' }}
          onClick={handleVisualize}
        >
          Apply Visualization
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          color="whiteAlpha.800"
          _hover={{ bg: 'rgba(255, 255, 255, 0.1)' }}
          onClick={onReset}
        >
          Reset View
        </Button>
      </VStack>

      <Box mt={4}>
        <Text color="whiteAlpha.700" fontSize="xs">
          Current Selection: {climateMetrics.find(m => m.value === selectedMetric)?.label}
        </Text>
      </Box>
    </VStack>
  )
}
