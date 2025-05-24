import { Ion } from 'cesium'

// Initialize Cesium Ion with your access token
// You'll need to register at https://cesium.com/ion/ to get a token
Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ACCESS_TOKEN || ''