import { useState, useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import StatusBar from './components/layout/StatusBar'
import InstancesView from './components/views/InstancesView'
import DiscoverView from './components/views/DiscoverView'
import SettingsView from './components/views/SettingsView'

type ViewType = 'instances' | 'discover' | 'settings'

interface AppState {
  currentUser: string
  downloadProgress: number
  downloadSpeed: string
  downloadPhase: string
  isDownloading: boolean
}

function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>('instances')
  const [appState, setAppState] = useState<AppState>({
    currentUser: 'Player123',
    downloadProgress: 0,
    downloadSpeed: '0.00 MB/s',
    downloadPhase: '',
    isDownloading: false
  })

  const handleNavigation = (route: string): void => {
    if (route === 'instances' || route === 'discover' || route === 'settings') {
      setCurrentView(route)
      console.log(`Navigating to: ${route}`)
    }
  }

  useEffect(() => {
    // Verificar que window.api existe antes de usarlo
    if (typeof window !== 'undefined' && window.api) {
      window.api.onDownloadProgress((data: any) => {
        setAppState((prevState) => ({
          ...prevState,
          downloadProgress: data.percentage,
          downloadSpeed: data.speed,
          downloadPhase: data.phase || 'Descargando...',
          isDownloading: data.isDownloading !== false 
        }))
      })
    }
  }, [])

  const renderView = (): React.JSX.Element => {
    switch (currentView) {
      case 'instances':
        return <InstancesView />
      case 'discover':
        return <DiscoverView />
      case 'settings':
        return <SettingsView />
      default:
        return <InstancesView />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-50">
      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar activeView={currentView} onNavigate={handleNavigation} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-zinc-950">
          <div className="p-8">{renderView()}</div>
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