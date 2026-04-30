import { useState, useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import InstancesView from './components/views/InstancesView'
import DiscoverView from './components/views/DiscoverView'
import SettingsView from './components/views/SettingsView'
import UpdatesView from './components/views/UpdatesView'
import GalleryView from './components/views/GalleryView'
import UpdateToast from './components/layout/UpdateToast'
import LogConsole from './components/layout/LogConsole'

// NUEVO: Importamos las vistas dedicadas para ventanas secundarias
import CreateInstanceWindow from './components/views/CreateInstanceWindow'
import ModsManagerWindow from './components/views/ModsManagerWindow'

type ViewType = 'instances' | 'discover' | 'settings' | 'updates' | 'gallery'

interface AppState {
  downloadProgress: number
  downloadSpeed: string
  downloadPhase: string
  downloadFile: string
  downloadRemaining: string
  isDownloading: boolean
}

function App(): React.JSX.Element {
  // === NUEVO: DETECCIÓN DE VENTANA ===
  const [secondaryRoute, setSecondaryRoute] = useState<'create-instance' | 'mods-manager' | null>(null)

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
    downloadFile: '',
    downloadRemaining: '',
    isDownloading: false
  })

  useEffect(() => {
    const hash = window.location.hash.toLowerCase()
    if (hash.includes('create-instance')) {
      setSecondaryRoute('create-instance')
    } else if (hash.includes('mods-manager')) {
      setSecondaryRoute('mods-manager')
    }
  }, [])

  // === NAVEGACIÓN Y DISCORD RPC ===
  const handleNavigation = (route: string): void => {
    if (route === 'instances' || route === 'discover' || route === 'settings' || route === 'updates' || route === 'gallery') {
      setCurrentView(route as ViewType)
      
      const statusMap: Record<string, string> = {
        instances: 'Gestionando Instancias',
        discover: 'Explorando Contenido',
        settings: 'Configurando el Motor',
        updates: 'Viendo Notas de Versión',
        gallery: 'Viendo sus Capturas'
      }
      
      if (typeof window !== 'undefined' && window.api && window.api.updateDiscordStatus) {
        window.api.updateDiscordStatus('Navegando en el Launcher', statusMap[route])
      }
    }
  }

  useEffect(() => {
    // Si estamos en la ventana secundaria, no necesitamos escuchar descargas ni updates aquí
    if (secondaryRoute) return

    if (typeof window !== 'undefined' && window.api) {
      window.api.onDownloadProgress((data: any) => {
        const remaining = typeof data.remainingBytes === 'number' && typeof data.totalBytes === 'number'
          ? `${(data.remainingBytes / (1024 * 1024)).toFixed(2)} MB faltantes de ${(data.totalBytes / (1024 * 1024)).toFixed(2)} MB`
          : ''

        setAppState((prevState) => ({
          ...prevState,
          downloadProgress: data.percentage,
          downloadSpeed: data.speed,
          downloadPhase: data.phase || 'Descargando...',
          downloadFile: data.downloadFile || '',
          downloadRemaining: remaining,
          isDownloading: data.isDownloading !== false 
        }))
      })

      window.api.onMinecraftLog((log: string) => {
        setLogs(prev => {
          const newLogs = [...prev, log]
          return newLogs.slice(-500)
        })
        if (log.includes('[ERROR]')) setIsConsoleOpen(true)
      })

      window.api.onUpdateAvailable((version: string) => {
        setUpdateVersion(version)
        setShowUpdateToast(true)
      })

      window.api.onUpdateReady(() => {
        setIsUpdateReady(true)
        setShowUpdateToast(true)
      })
    }
  }, [secondaryRoute])

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
      case 'gallery': return <GalleryView />
      default: return <InstancesView />
    }
  }

  // === RENDERIZADO CONDICIONAL PARA VENTANA SECUNDARIA ===
  if (secondaryRoute === 'create-instance') {
    return (
      <div className="h-screen w-screen bg-zinc-950 text-zinc-200 overflow-hidden">
        <CreateInstanceWindow />
      </div>
    )
  }

  if (secondaryRoute === 'mods-manager') {
    return (
      <div className="h-screen w-screen bg-zinc-950 text-zinc-200 overflow-hidden">
        <ModsManagerWindow />
      </div>
    )
  }

  // === RENDERIZADO NORMAL DEL LAUNCHER ===
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 select-none overflow-hidden border border-zinc-800/50 relative">
      <Sidebar 
        activeView={currentView} 
        onNavigate={handleNavigation} 
        onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
        isConsoleOpen={isConsoleOpen}
      />

      <main className="flex-1 overflow-auto bg-zinc-950 custom-scrollbar">
        <div className="p-8">{renderView()}</div>
      </main>

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
          {appState.downloadFile ? (
            <>
              <div className="text-sm text-zinc-300 break-words mb-2">
                Descargando archivo: <span className="font-semibold text-zinc-100">{appState.downloadFile}</span>
              </div>
              {appState.downloadRemaining && (
                <div className="text-xs text-zinc-400">{appState.downloadRemaining}</div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App