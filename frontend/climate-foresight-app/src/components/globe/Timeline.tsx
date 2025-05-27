'use client'

import { Box, Flex, Text } from '@chakra-ui/react'
import {
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    SliderMark
  } from '@chakra-ui/slider'
import { useState, useEffect } from 'react'

interface TimelineProps {
  onTimeChange: (hour: number) => void
  currentHour: number
  hours: Array<{
    hour: number
    formatted_time: string
  }>
}

const formatHour = (hour: number): string => {
  if (hour === 0) return '12AM'
  if (hour < 12) return `${hour}AM`
  if (hour === 12) return '12PM'
  return `${hour - 12}PM`
}

export default function Timeline({ onTimeChange, currentHour, hours }: TimelineProps) {
  const [sliderValue, setSliderValue] = useState(currentHour)

  useEffect(() => {
    setSliderValue(currentHour)
  }, [currentHour])

  const handleChange = (value: number) => {
    setSliderValue(value)
    onTimeChange(value)
  }

  // Generate all 24 hours with formatted labels
  const allHours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: formatHour(i)
  }))

  return (
    <Box 
      position="absolute" 
      bottom="20px" 
      left="0" 
      right="0" 
      px="20px" 
      zIndex="1000"
    >
      <Box 
        bg="rgba(0, 0, 0, 0.7)" 
        borderRadius="md" 
        p={4}
        backdropFilter="blur(5px)"
      >
        <Slider 
          min={0} 
          max={23} 
          step={1}
          value={sliderValue}
          onChange={handleChange}
          aria-label="Time slider"
        >
          {/* Add marks for all hours */}
          {allHours.map(({ hour, label }) => (
            <SliderMark
              key={hour}
              value={hour}
              mt={2}
              ml={-3}
              fontSize="sm"
              color="white"
            >
              {hour % 2 === 0 ? label : ''} {/* Show every other hour to prevent crowding */}
            </SliderMark>
          ))}
          
          <SliderTrack bg="gray.600" height="4px">
            <SliderFilledTrack bg="blue.400" />
          </SliderTrack>
          
          {/* Custom white circular thumb with current time */}
          <SliderThumb 
            boxSize={15}
            bg="white"
            border="2px solid"
            borderColor="blue.400"
          >
            <Box 
              position="absolute" 
              top="-30px" 
              left="50%" 
              transform="translateX(-50%)"
              color="white" 
              fontSize="sm"
              fontWeight="bold"
              bg="rgba(0, 0, 0, 0.7)"
              px={2}
              py={1}
              borderRadius="md"
            >
              {formatHour(sliderValue)}
            </Box>
          </SliderThumb>
        </Slider>
        
        {/* Show major time markers (every 6 hours) */}
        {/* <Flex justify="space-between" mt={6}>
          {[0, 6, 12, 18].map((hour) => (
            <Text key={hour} color="white" fontSize="sm" fontWeight="bold">
              {formatHour(hour)}
            </Text>
          ))}
        </Flex> */}
      </Box>
    </Box>
  )
}