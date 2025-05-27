'use client'

import { Box, Flex } from '@chakra-ui/react'
import GlobeViewer from './globe/GlobeViewer'
import ClimateControls from './globe/ClimateControls'
import FloatingHeader from './FloatingHeader'
import { useState, useRef } from 'react'

export default function Home() {
  const [globeKey, setGlobeKey] = useState(0) // Used to force reset
  const globeRef = useRef<any>(null);

  const handleVisualize = (metric: string, opacity: number, resolution: number) => {
    if (globeRef.current) {
      globeRef.current.visualizeClimate(metric, opacity, resolution);
    }
  }

  const handleReset = () => {
    // Force re-render of GlobeViewer to reset
    setGlobeKey(prev => prev + 1)
  }

  return (
    <Box minH="100vh" position="relative">
      <FloatingHeader />
      
      <Flex 
        direction={{ base: 'column', md: 'row' }}
        minH="100vh"
        pt={20}
      >
        <Box 
          flex="1" 
          h={{ base: '80vh', md: '80vh' }}
          position="relative"
        >
          <GlobeViewer 
            key={globeKey}
            ref={globeRef}
          />
        </Box>
        
        <Box 
          w={{ base: '100%', md: '320px' }}
          bg="rgba(255, 255, 255, 0.1)"
          backdropFilter="blur(10px)"
          borderLeft={{ md: '1px solid rgba(255, 255, 255, 0.2)' }}
          p={6}
          h={{ base: '20vh', md: '80vh' }}
          overflowY="auto"
        >
          <ClimateControls 
            onVisualize={handleVisualize}
            onReset={handleReset}
          />
        </Box>
      </Flex>
    </Box>
  )
}