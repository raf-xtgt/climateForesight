// components/globe/ClimateLegend.tsx
'use client'

import { Box, Flex, Text } from '@chakra-ui/react'

interface LegendItem {
  color: string
  label: string
}

interface ClimateLegendProps {
  variable: string
  unit: string
  items: LegendItem[]
}

export default function ClimateLegend({ variable, unit, items }: ClimateLegendProps) {
  return (
    <Box
      position="absolute"
      bottom="20px"
      right="20px"
      bg="rgba(0, 0, 0, 0.7)"
      p={4}
      borderRadius="md"
      zIndex={999}
      color="white"
      minWidth="200px"
    >
      <Text fontWeight="bold" mb={2}>
        {variable} ({unit})
      </Text>
      {items.map((item, index) => (
        <Flex key={index} align="center" mb={1}>
          <Box
            width="20px"
            height="20px"
            bg={item.color}
            mr={2}
            borderRadius="sm"
          />
          <Text fontSize="sm">{item.label}</Text>
        </Flex>
      ))}
    </Box>
  )
}