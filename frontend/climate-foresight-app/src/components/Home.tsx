import { Box, Flex } from '@chakra-ui/react'
import GlobeViewer from './globe/GlobeViewer'
import ClimateControls from './globe/ClimateControls'
import FloatingHeader from './FloatingHeader'

export default function Home() {
  return (
    <Box 
      minH="100vh"
      position="relative"
    >
      <FloatingHeader />
      
      <Flex 
        direction={{ base: 'column', md: 'row' }}
        minH="100vh"
        pt={20} // Add padding top to account for floating header
      >
        <Box 
          flex="1" 
          h={{ base: '80vh', md: '80vh' }}
          position="relative"
        >
          <GlobeViewer />
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
          <ClimateControls />
        </Box>
      </Flex>
    </Box>
  )
}