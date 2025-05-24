import GlobeViewer from './globe/GlobeViewer'
import ClimateControls from './globe/ClimateControls'

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">Climate Globe Visualizer</h1>
      </header>
      <main className="flex-1 flex flex-col md:flex-row">
        <div className="flex-1">
          <GlobeViewer />
        </div>
        <div className="w-full md:w-64 bg-gray-100 p-4">
          <ClimateControls />
        </div>
      </main>
    </div>
  )
}