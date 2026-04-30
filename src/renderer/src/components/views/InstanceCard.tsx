import { useState } from 'react'

interface MinecraftInstance {
  id: string
  name: string
  version: string
  loader: string
  playtime: number
  icon: string
}

interface InstanceCardProps {
  instance: MinecraftInstance
  onDelete: (id: string) => void
  onConfigure: () => void // NUEVA PROPIEDAD: Para avisar que queremos configurar
}

function getLoaderColor(loader: string): string {
  const normalized = loader.toLowerCase()

  if (normalized.includes('fabric')) {
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }

  if (normalized.includes('forge')) {
    return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  }

  if (normalized.includes('vanilla')) {
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  }

  return 'bg-zinc-700/20 text-zinc-400 border-zinc-700/30'
}

// Función para convertir segundos a un texto legible
function formatPlaytime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds === 0) return '0m'
  
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function InstanceCard({ instance, onDelete, onConfigure }: InstanceCardProps): React.JSX.Element {
  const [isCleaning, setIsCleaning] = useState<boolean>(false)
  const loaderColorClass = getLoaderColor(instance.loader)

  const formattedPlaytime = formatPlaytime(instance.playtime)

  const handleCleanLogs = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation() // Evita que el clic se confunda con doble clic
    if (isCleaning) return

    setIsCleaning(true)
    try {
      // @ts-ignore
      const result = await window.api.cleanInstanceLogs(instance.id)
      if (result.success) {
        alert(result.message)
      }
    } catch (error) {
      console.error('Error cleaning logs:', error)
    } finally {
      setIsCleaning(false)
    }
  }

  const handleLaunch = (e: React.MouseEvent): void => {
    e.stopPropagation()
    // @ts-ignore
    window.api.launchInstance(instance)
  }

  return (
    <div
      onDoubleClick={handleLaunch}
      className="relative w-full h-full group cursor-pointer"
      title="Doble clic para jugar"
    >
      {/* NUEVO: Contenedor de Botones Superiores (Aparecen en Hover) */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        
        {/* Botón de Configuración (Engranaje) */}
        <button
          onClick={(e) => {
            e.stopPropagation() 
            onConfigure()
          }}
          className="p-1.5 rounded-md bg-zinc-950/80 text-zinc-400 hover:text-white hover:bg-indigo-600 transition-colors duration-200 shadow-sm"
          title="Configurar mods e instancia"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Botón de Borrar Instancia */}
        <button
          onClick={(e) => {
            e.stopPropagation() 
            onDelete(instance.id)
          }}
          className="p-1.5 rounded-md bg-zinc-950/80 text-zinc-400 hover:text-white hover:bg-red-600 transition-colors duration-200 shadow-sm"
          title="Borrar instancia"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Contenedor Principal */}
      <div className="w-full h-48 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between transition-all duration-200 group-hover:border-indigo-500 group-hover:bg-zinc-800/30 group-hover:shadow-lg group-hover:shadow-indigo-500/10">
        <div className="flex items-start justify-between pr-16"> {/* Aumentado el padding right para no chocar con los botones */}
          <div className="flex flex-col items-start flex-1">
            <div className="text-3xl mb-2">{instance.icon || '📦'}</div>
            <h3 className="text-sm font-semibold text-zinc-50 line-clamp-2">
              {instance.name}
            </h3>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700">
              {instance.version}
            </span>
          </div>

          <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${loaderColorClass} w-fit`}>
            <span className="font-medium">{instance.loader || 'Vanilla'}</span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-zinc-500 font-medium flex items-center gap-1">
              <span>⏱️ {formattedPlaytime}</span>
            </div>
            
            <button
              onClick={handleCleanLogs}
              disabled={isCleaning}
              className={`p-1.5 rounded bg-zinc-800/50 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 group/clean ${
                isCleaning ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Limpiar archivos de logs (.gz)"
            >
              <div className="flex items-center gap-1.5">
                <span className={`text-xs transition-transform duration-300 ${isCleaning ? 'animate-spin' : 'group-hover/clean:rotate-12'}`}>
                  {isCleaning ? '⏳' : '🧹'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstanceCard