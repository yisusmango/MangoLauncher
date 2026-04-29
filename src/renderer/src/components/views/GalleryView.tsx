import { useState, useEffect } from 'react'
import { Trash2, FolderOpen, Camera, X } from 'lucide-react'

interface MinecraftInstance {
  id: string
  name: string
  version: string
  loader: string
  playtime: number
  icon: string
}

interface ScreenshotData {
  name: string
  path: string
  url: string
  date: number
}

interface SelectedImage {
  url: string
  name: string
}

export default function GalleryView(): React.JSX.Element {
  const [instances, setInstances] = useState<MinecraftInstance[]>([])
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null)
  const [screenshots, setScreenshots] = useState<ScreenshotData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // Cargar instancias al montar el componente
  useEffect(() => {
    loadInstances()
  }, [])

  // Cargar screenshots cuando cambie la instancia seleccionada
  useEffect(() => {
    if (selectedInstance) {
      loadScreenshots(selectedInstance)
    }
  }, [selectedInstance])

  const loadInstances = async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.api && window.api.getInstances) {
        const instances = await window.api.getInstances()
        setInstances(instances)
        
        // Seleccionar la primera instancia automáticamente
        if (instances.length > 0) {
          setSelectedInstance(instances[0].id)
        }
      }
    } catch (err) {
      console.error('[GalleryView] Error cargando instancias:', err)
    }
  }

  const loadScreenshots = async (instanceId: string): Promise<void> => {
    try {
      setIsLoading(true)
      if (typeof window !== 'undefined' && window.api && window.api.getScreenshots) {
        const screenshots = await window.api.getScreenshots(instanceId)
        setScreenshots(screenshots)
      }
    } catch (err) {
      console.error('[GalleryView] Error cargando capturas:', err)
      setScreenshots([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteScreenshot = async (fileName: string, index: number): Promise<void> => {
    if (!selectedInstance) return

    try {
      setIsDeletingId(fileName)
      if (typeof window !== 'undefined' && window.api && window.api.deleteScreenshot) {
        const success = await window.api.deleteScreenshot(selectedInstance, fileName)
        if (success) {
          // Recargar screenshots después de eliminar
          const updatedScreenshots = screenshots.filter((_, i) => i !== index)
          setScreenshots(updatedScreenshots)
        }
      }
    } catch (err) {
      console.error('[GalleryView] Error eliminando captura:', err)
    } finally {
      setIsDeletingId(null)
    }
  }

  const handleOpenFolder = (): void => {
    if (!selectedInstance) return

    try {
      if (typeof window !== 'undefined' && window.api && window.api.openScreenshotFolder) {
        window.api.openScreenshotFolder(selectedInstance)
      }
    } catch (err) {
      console.error('[GalleryView] Error abriendo carpeta:', err)
    }
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Camera className="w-8 h-8 text-indigo-400" />
        <h1 className="text-3xl font-bold text-zinc-100">Galería de Capturas</h1>
      </div>

      {/* Selector de Instancia */}
      <div className="flex items-center gap-4">
        <label htmlFor="instance-select" className="text-sm font-medium text-zinc-300">
          Instancia:
        </label>
        <select
          id="instance-select"
          value={selectedInstance || ''}
          onChange={(e) => setSelectedInstance(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors hover:border-zinc-600"
        >
          <option value="">Selecciona una instancia</option>
          {instances.map((instance) => (
            <option key={instance.id} value={instance.id}>
              {instance.name} ({instance.version})
            </option>
          ))}
        </select>

        {selectedInstance && (
          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 border border-indigo-500/40 rounded-lg text-indigo-300 hover:bg-indigo-600/30 hover:border-indigo-500/60 transition-all duration-200 group"
            title="Abrir carpeta de capturas"
          >
            <FolderOpen className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">Abrir Carpeta</span>
          </button>
        )}
      </div>

      {/* Grid de Capturas */}
      {selectedInstance ? (
        <>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 border-4 border-zinc-700 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-zinc-400">Cargando capturas...</p>
            </div>
          ) : screenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Camera className="w-16 h-16 text-zinc-700" />
              <p className="text-zinc-400 text-lg">Sin capturas</p>
              <p className="text-zinc-500 text-sm">Aún no hay capturas en esta instancia</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshots.map((screenshot, index) => (
                <div
                  key={screenshot.name}
                  className="group relative bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer"
                >
                  {/* Imagen */}
                  <div
                    className="relative w-full aspect-video bg-zinc-950 overflow-hidden"
                    onClick={() => setSelectedImage({ url: screenshot.url, name: screenshot.name })}
                  >
                    <img
                      src={screenshot.url}
                      alt={screenshot.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23404040" width="400" height="300"/%3E%3C/svg%3E'
                      }}
                    />
                    {/* Overlay oscuro en hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </div>

                  {/* Info y Botones */}
                  <div className="p-3 flex flex-col gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-400 truncate" title={screenshot.name}>
                        {screenshot.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(screenshot.date)}
                      </p>
                    </div>

                    {/* Botón de Eliminar */}
                    <button
                      onClick={() => handleDeleteScreenshot(screenshot.name, index)}
                      disabled={isDeletingId === screenshot.name}
                      className="flex items-center justify-center gap-1 w-full px-2 py-1.5 bg-red-600/20 border border-red-500/40 rounded text-red-400 hover:bg-red-600/30 hover:border-red-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs font-medium"
                      title="Eliminar captura"
                    >
                      {isDeletingId === screenshot.name ? (
                        <>
                          <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Eliminando...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Borrar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Camera className="w-16 h-16 text-zinc-700" />
          <p className="text-zinc-400 text-lg">Selecciona una instancia</p>
          <p className="text-zinc-500 text-sm">Elige una instancia para ver sus capturas</p>
        </div>
      )}

      {/* Modal de Vista Completa */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-zinc-900 rounded-lg overflow-hidden shadow-2xl max-w-4xl w-full border border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado del Modal */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-zinc-100 font-semibold truncate pr-4">
                {selectedImage.name}
              </h2>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Imagen a tamaño completo */}
            <div className="flex items-center justify-center bg-black/50 p-4">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-w-full max-h-[70vh] rounded"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23404040" width="400" height="300"/%3E%3C/svg%3E'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
