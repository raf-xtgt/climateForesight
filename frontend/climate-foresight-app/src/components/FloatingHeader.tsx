'use client'

import { 
  Box, 
  Flex, 
  Heading, 
  Button, 
  HStack,
  IconButton
} from '@chakra-ui/react'
import { FiSettings, FiDownload, FiShare2, FiMenu } from 'react-icons/fi'

export default function FloatingHeader() {

  return (
    <Box
      position="fixed"
      top={4}
      left={4}
      right={4}
      zIndex={1000}
      bg="rgba(255, 255, 255, 0.95)"
      backdropFilter="blur(10px)"
      borderRadius="xl"
      border="1px solid"
      borderColor="gray.200"
      shadow="lg"
      px={6}
      py={3}
    >
      <Flex justify="space-between" align="center">
        <Heading size="lg" color="blue.600" fontWeight="bold">
          Climate Foresight
        </Heading>
        
        <HStack gap={2}>
          <Button
            size="sm"
            variant="ghost"
            colorScheme="blue"
          >
            Share
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            colorScheme="blue"
          >
            Export
          </Button>
          
          <IconButton
            size="sm"
            variant="ghost"
            colorScheme="blue"
            aria-label="Settings"
          >
            <FiSettings />
          </IconButton>
          
          <IconButton
            size="sm"
            variant="outline"
            colorScheme="blue"
            aria-label="Menu"
            display={{ base: 'flex', md: 'none' }}
          >
            <FiMenu />
          </IconButton>
        </HStack>
      </Flex>
    </Box>
  )
}