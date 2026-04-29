import { useState, useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import InstancesView from './components/views/InstancesView'
import DiscoverView from './components/views/DiscoverView'
import SettingsView from './components/views/SettingsView'
import UpdatesView from './components/views/UpdatesView'
import UpdateToast from './components/layout/UpdateToast'
import LogConsole from './components/layout/LogConsole' // <-- NUEVA IMPORTACIÓN

type ViewType = 'instances' | 'discover' | 'settings' | 'updates'

interface AppState {
  downloadProgress: number
  downloadSpeed: string
  downloadPhase: string
  isDownloading: boolean
}

function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>('instances')
  
  // === ESTADOS PARA LA CONSOLA ===
  const [logs, setLogs] = useState<string[]>([])
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)
  
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [isUpdateReady, setIsUpdateReady] = useState(false)
  const [showUpdateToast, setShowUpdateToast] = useState(false)

  const [appState, setAppState] = useState<AppState>({
    downloadProgress: 0,
    downloadSpeed: '0.00 MB/s',
    downloadPhase: '',
    isDownloading: false
  })

  const handleNavigation = (route: string): void => {
    if (route === 'instances' || route === 'discover' || route === 'settings' || route === 'updates') {
      setCurrentView(route as ViewType)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && window.api) {
      // 1. Escuchar progreso de descargas
      window.api.onDownloadProgress((data: any) => {
        setAppState((prevState) => ({
          ...prevState,
          downloadProgress: data.percentage,
          downloadSpeed: data.speed,
          downloadPhase: data.phase || 'Descargando...',
          isDownloading: data.isDownloading !== false 
        }))
      })

      // 2. ESCUCHAR LOGS DE MINECRAFT
      window.api.onMinecraftLog((log: string) => {
        setLogs(prev => {
          const newLogs = [...prev, log]
          // Mantenemos solo los últimos 500 logs para no saturar la RAM
          return newLogs.slice(-500)
        })
        // Opcional: Abrir consola automáticamente si hay un error crítico
        if (log.includes('[ERROR]')) setIsConsoleOpen(true)
      })

      // 3. Eventos del Auto-Updater
      window.api.onUpdateAvailable((version: string) => {
        setUpdateVersion(version)
        setShowUpdateToast(true)
      })

      window.api.onUpdateReady(() => {
        setIsUpdateReady(true)
        setShowUpdateToast(true)
      })
    }
  }, [])

  const handleUpdateAction = () => {
    if (isUpdateReady) {
      window.api.installUpdate()
    } else {
      window.api.startDownloadUpdate()
      setShowUpdateToast(false)
    }
  }

  const renderView = (): React.JSX.Element => {
    switch (currentView) {
      case 'instances': return <InstancesView />
      case 'discover': return <DiscoverView />
      case 'settings': return <SettingsView />
      case 'updates': return <UpdatesView />
      default: return <InstancesView />
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 select-none overflow-hidden border border-zinc-800/50 rounded-xl relative">
      {/* Sidebar con props de consola */}
      <Sidebar 
        activeView={currentView} 
        onNavigate={handleNavigation} 
        onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
        isConsoleOpen={isConsoleOpen}
      />

      <main className="flex-1 overflow-auto bg-zinc-950 custom-scrollbar">
        <div className="p-8">{renderView()}</div>
      </main>

      {/* CONSOLA DE LOGS */}
      <LogConsole 
        logs={logs} 
        isOpen={isConsoleOpen} 
        onClose={() => setIsConsoleOpen(false)} 
      />

      {showUpdateToast && updateVersion && (
        <UpdateToast 
          version={updateVersion} 
          isReady={isUpdateReady} 
          onAction={handleUpdateAction}
          onDismiss={() => setShowUpdateToast(false)}
        />
      )}

      {appState.isDownloading && (
        <div className="absolute bottom-6 right-6 bg-zinc-900/95 backdrop-blur border border-zinc-800 p-5 rounded-xl shadow-2xl w-80 z-50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-zinc-50 truncate pr-2">
              {appState.downloadPhase}
            </span>
            <span className="text-xs font-semibold text-indigo-400 whitespace-nowrap">
              {appState.downloadSpeed}
            </span>
          </div>
          <div className="w-full bg-zinc-800/50 rounded-full h-2.5 mb-2 overflow-hidden border border-zinc-800">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-300 relative overflow-hidden"
              style={{ width: `${appState.downloadProgress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-zinc-500">
              {appState.downloadProgress}% completado
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default App