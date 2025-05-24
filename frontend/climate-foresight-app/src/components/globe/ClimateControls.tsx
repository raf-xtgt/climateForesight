'use client'

import { useState } from 'react'
import {
  NativeSelectField,
  NativeSelectRoot,
  Stack,
  Heading,
} from '@chakra-ui/react'

export default function ClimateControls() {
  const [selectedMetric, setSelectedMetric] = useState('temperature')

  const climateMetrics = [
    { value: 'temperature', label: 'Temperature' },
    { value: 'rainfall', label: 'Rainfall' },
    { value: 'sunlight', label: 'Sunlight' },
    { value: 'humidity', label: 'Humidity' },
    { value: 'wind-speed', label: 'Wind Speed' },
  ]

  return (
    <Stack gap={4}>
      <Heading size="md">Climate Controls</Heading>
      <NativeSelectRoot>
        <NativeSelectField
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
        >
          {climateMetrics.map((metric) => (
            <option key={metric.value} value={metric.value}>
              {metric.label}
            </option>
          ))}
        </NativeSelectField>
      </NativeSelectRoot>
    </Stack>
  )
}