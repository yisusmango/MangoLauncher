import { useState, useEffect } from 'react'
import Sidebar from './components/layout/Sidebar'
import InstancesView from './components/views/InstancesView'
import DiscoverView from './components/views/DiscoverView'
import SettingsView from './components/views/SettingsView'
import UpdatesView from './components/views/UpdatesView'
import UpdateToast from './components/layout/UpdateToast' // <-- IMPORTAMOS EL TOAST

type ViewType = 'instances' | 'discover' | 'settings' | 'updates'

interface AppState {
  downloadProgress: number
  downloadSpeed: string
  downloadPhase: string
  isDownloading: boolean
}

function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>('instances')
  
  // === ESTADOS PARA LA ACTUALIZACIÓN ===
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [isUpdateReady, setIsUpdateReady] = useState(false)
  const [showUpdateToast, setShowUpdateToast] = useState(false)
  // =====================================

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
      // Escuchar el progreso de las descargas (juego o updates)
      window.api.onDownloadProgress((data: any) => {
        setAppState((prevState) => ({
          ...prevState,
          downloadProgress: data.percentage,
          downloadSpeed: data.speed,
          downloadPhase: data.phase || 'Descargando...',
          isDownloading: data.isDownloading !== false 
        }))
      })

      // === ESCUCHAR EVENTOS DEL AUTO-UPDATER ===
      window.api.onUpdateAvailable((version: string) => {
        setUpdateVersion(version)
        setShowUpdateToast(true)
      })

      window.api.onUpdateReady(() => {
        setIsUpdateReady(true)
        setShowUpdateToast(true) // Volvemos a mostrar el toast para pedir instalación
      })
      // ==========================================
    }
  }, [])

  // === MANEJADOR DE ACCIONES DEL TOAST ===
  const handleUpdateAction = () => {
    if (isUpdateReady) {
      window.api.installUpdate() // Cierra e instala
    } else {
      window.api.startDownloadUpdate() // Empieza la descarga
      setShowUpdateToast(false) // Ocultamos el toast (el progreso se verá en el widget inferior)
    }
  }
  // =======================================

  const renderView = (): React.JSX.Element => {
    switch (currentView) {
      case 'instances':
        return <InstancesView />
      case 'discover':
        return <DiscoverView />
      case 'settings':
        return <SettingsView />
      case 'updates':
        return <UpdatesView />
      default:
        return <InstancesView />
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 select-none overflow-hidden border border-zinc-800/50 rounded-xl relative">
      <Sidebar activeView={currentView} onNavigate={handleNavigation} />

      <main className="flex-1 overflow-auto bg-zinc-950 custom-scrollbar">
        <div className="p-8">{renderView()}</div>
      </main>

      {/* NOTIFICACIÓN CUSTOM DE ACTUALIZACIÓN */}
      {showUpdateToast && updateVersion && (
        <UpdateToast 
          version={updateVersion} 
          isReady={isUpdateReady} 
          onAction={handleUpdateAction}
          onDismiss={() => setShowUpdateToast(false)}
        />
      )}

      {/* WIDGET DE DESCARGA FLOTANTE (Se usará tanto para MC como para el Updater) */}
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