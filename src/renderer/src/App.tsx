import { useState, useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import StatusBar from './components/layout/StatusBar'
import InstancesView from './components/views/InstancesView'

interface AppState {
  currentUser: string
  downloadProgress: number
  downloadSpeed: string
  downloadPhase: string
  isDownloading: boolean
}

function App(): React.JSX.Element {
  const [appState, setAppState] = useState<AppState>({
    currentUser: 'Player123',
    downloadProgress: 0,
    downloadSpeed: '0.00 MB/s',
    downloadPhase: '',
    isDownloading: false
  })

  const handleNavigation = (route: string): void => {
    console.log(`Navigating to: ${route}`)
  }

  useEffect(() => {
    // @ts-ignore - Ignoramos el tipado estricto del preload temporalmente
    window.api.onDownloadProgress((data: any) => {
      setAppState((prevState) => ({
        ...prevState,
        downloadProgress: data.percentage,
        downloadSpeed: data.speed,
        downloadPhase: data.phase || 'Descargando...',
        // Si backend manda false, apagamos la barra. Si no manda nada, asumimos true.
        isDownloading: data.isDownloading !== false 
      }))
    })
  }, [])

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-50">
      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar onNavigate={handleNavigation} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-zinc-950">
          <div className="p-8">
            <InstancesView />
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar
        currentUser={appState.currentUser}
        downloadProgress={appState.downloadProgress}
        downloadSpeed={appState.downloadSpeed}
        downloadPhase={appState.downloadPhase}
        isDownloading={appState.isDownloading}
      />
    </div>
  )
}

export default App