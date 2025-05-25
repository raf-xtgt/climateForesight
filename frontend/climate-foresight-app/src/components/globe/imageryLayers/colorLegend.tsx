import {Viewer} from 'cesium'

export const addColorLegend = (viewer: Viewer, minValue: number, maxValue: number) => {
    const legend = document.createElement('div')
    legend.style.position = 'absolute'
    legend.style.bottom = '50px'
    legend.style.right = '50px'
    legend.style.backgroundColor = 'rgba(0,0,0,0.7)'
    legend.style.padding = '10px'
    legend.style.color = 'white'
    legend.style.borderRadius = '5px'
    
    // Create gradient
    legend.innerHTML = `
      <div style="
        height: 20px;
        width: 100%;
        background: linear-gradient(to right, blue, green, red);
        margin-bottom: 5px;
      "></div>
      <div style="display: flex; justify-content: space-between;">
        <span>${minValue.toFixed(1)}°C</span>
        <span>${((minValue + maxValue) / 2).toFixed(1)}°C</span>
        <span>${maxValue.toFixed(1)}°C</span>
      </div>
      <div style="text-align: center; margin-top: 5px;">Temperature</div>
    `
    
    viewer.container.appendChild(legend)
  }