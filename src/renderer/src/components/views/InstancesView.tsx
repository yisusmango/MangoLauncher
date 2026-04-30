import { useState, useEffect } from 'react'
import InstanceCard from './InstanceCard'
import ModsManager from './ModsManager'

interface MinecraftInstance {
  id: string
  name: string
  version: string
  loader: string
  playtime: number
  icon: string
}

function InstancesView(): React.JSX.Element {
  const [instances, setInstances] = useState<MinecraftInstance[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  // Estado para controlar qué instancia se está configurando (null = ninguna, muestra la lista)
  const [configuringInstance, setConfiguringInstance] = useState<MinecraftInstance | null>(null)

  useEffect(() => {
    const loadInstances = async (): Promise<void> => {
      try {
        // @ts-ignore
        const loadedInstances = await window.api.getInstances()
        setInstances(loadedInstances)
      } catch (error) {
        console.error('Error loading instances:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadInstances()
    const interval = setInterval(loadInstances, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (id: string): Promise<void> => {
    const confirmDelete = confirm('¿Estás seguro que deseas eliminar esta instancia? Se borrarán todos sus archivos.')
    if (!confirmDelete) return
    try {
      // @ts-ignore
      const updatedInstances = await window.api.deleteInstance(id)
      setInstances(updatedInstances)
    } catch (error) {
      console.error('Error deleting instance:', error)
    }
  }

  const handleOpenCreator = () => {
    // @ts-ignore
    if (window.api && window.api.openCreateInstanceWindow) {
      // @ts-ignore
      window.api.openCreateInstanceWindow()
    } else {
      console.warn('Falta conectar el Preload y el Main para abrir la ventana.')
    }
  }

  // --- NUEVA VISTA DE CONFIGURACIÓN ---
  // Si hay una instancia seleccionada, mostramos su panel de mods en lugar de la cuadrícula
  if (configuringInstance) {
    return (
      <div className="w-full h-full flex flex-col">
        {/* Cabecera con botón de regreso */}
        <div className="mb-6 flex items-center gap-4">
          <button 
            onClick={() => setConfiguringInstance(null)}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center justify-center"
          >
             {/* Icono de flecha simple */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-zinc-50 flex items-center gap-2">
              <span className="text-xl">{configuringInstance.icon}</span> 
              Configurando: {configuringInstance.name}
            </h2>
            <p className="text-sm text-zinc-400 font-mono">
              v{configuringInstance.version} • {configuringInstance.loader}
            </p>
          </div>
        </div>

        {/* Panel de Gestión (El "cerebro") */}
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 overflow-hidden flex flex-col">
           <h3 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
             <span>🧩</span> Gestor de Mods
           </h3>
<p className="text-zinc-500 mb-4 text-sm">
          Busca y descarga mods directamente desde Modrinth para esta instancia.
        </p>
        {/* AQUÍ INYECTAMOS NUESTRO NUEVO COMPONENTE */}
        <ModsManager 
          instanceId={configuringInstance.id} 
          instanceVersion={configuringInstance.version} 
          instanceLoader={configuringInstance.loader} 
        />
     </div>
   </div>
 )
  }

  // --- VISTA NORMAL DE INSTANCIAS ---
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-50 mb-2">Instancias</h2>
          <p className="text-zinc-400">Gestiona y lanza tus instancias de Minecraft</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-400">Cargando instancias...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-50 mb-2">Instancias</h2>
        <p className="text-zinc-400">Gestiona y lanza tus instancias de Minecraft</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-4">
        {instances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 border border-zinc-800 rounded-xl border-dashed">
            <span className="text-6xl mb-4">📦</span>
            <p className="text-zinc-400 mb-6 text-lg">No tienes ninguna instancia instalada</p>
            <button
              onClick={handleOpenCreator}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              Crear Nueva Instancia
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {instances.map((instance) => (
              <InstanceCard 
                key={instance.id} 
                instance={instance} 
                onDelete={handleDelete}
                // Pasamos la función para abrir la configuración
                onConfigure={() => setConfiguringInstance(instance)} 
              />
            ))}

            <button
              onClick={handleOpenCreator}
              className="w-full h-48 border-2 border-dashed border-zinc-700 hover:border-indigo-500 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors duration-200 cursor-pointer group bg-zinc-900/30 hover:bg-zinc-900/50"
            >
              <span className="text-3xl text-zinc-600 group-hover:text-indigo-400 transition-colors">+</span>
              <span className="text-sm font-medium text-zinc-400 group-hover:text-indigo-400">
                Añadir Instancia
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default InstancesView