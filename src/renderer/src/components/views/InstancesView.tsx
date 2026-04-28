import { useState, useEffect } from 'react'
import InstanceCard from './InstanceCard'

interface MinecraftInstance {
  id: string
  name: string
  version: string
  loader: string
  playtime: number
  icon: string
}

interface CreateInstanceFormData {
  name: string
  version: string
}

function InstancesView(): React.JSX.Element {
  const [instances, setInstances] = useState<MinecraftInstance[]>([])
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [formData, setFormData] = useState<CreateInstanceFormData>({
    name: '',
    version: ''
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [versions, setVersions] = useState<string[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false)

  // Load instances on mount
  useEffect(() => {
    const loadInstances = async (): Promise<void> => {
      try {
        const loadedInstances = await window.api.getInstances()
        setInstances(loadedInstances)
      } catch (error) {
        console.error('Error loading instances:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadInstances()
  }, [])

  // Load versions when modal opens
  useEffect(() => {
    if (isModalOpen && versions.length === 0) {
      const loadVersions = async (): Promise<void> => {
        try {
          setIsLoadingVersions(true)
          const fetchedVersions = await window.api.getMinecraftVersions()
          setVersions(fetchedVersions)
          if (fetchedVersions.length > 0 && !formData.version) {
            setFormData((prev) => ({
              ...prev,
              version: fetchedVersions[0]
            }))
          }
        } catch (error) {
          console.error('Error loading versions:', error)
        } finally {
          setIsLoadingVersions(false)
        }
      }
      loadVersions()
    }
  }, [isModalOpen, versions.length, formData.version])

  const handleCreateInstance = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Please enter an instance name')
      return
    }

    try {
      const updatedInstances = await window.api.createInstance({
        name: formData.name,
        version: formData.version,
        loader: 'Vanilla',
        icon: '📦'
      })
      setInstances(updatedInstances)
      setFormData({ name: '', version: versions[0] || '' })
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error creating instance:', error)
      alert('Failed to create instance')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDelete = async (id: string): Promise<void> => {
    const confirmDelete = confirm('¿Estás seguro que deseas eliminar esta instancia? Se borrarán todos sus archivos.')
    if (!confirmDelete) {
      return
    }

    try {
      const updatedInstances = await window.api.deleteInstance(id)
      setInstances(updatedInstances)
    } catch (error) {
      console.error('Error deleting instance:', error)
      alert('Failed to delete instance')
    }
  }

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
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-50 mb-2">Instancias</h2>
        <p className="text-zinc-400">Gestiona y lanza tus instancias de Minecraft</p>
      </div>

      {instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-zinc-400 mb-4">No hay instancias disponibles</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Crear Primera Instancia
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {instances.map((instance) => (
            <InstanceCard key={instance.id} instance={instance} onDelete={handleDelete} />
          ))}

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full h-48 border-2 border-dashed border-zinc-700 hover:border-indigo-500 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors duration-200 cursor-pointer group bg-zinc-900/30 hover:bg-zinc-900/50"
          >
            <span className="text-3xl group-hover:text-indigo-400 transition-colors">+</span>
            <span className="text-sm font-medium text-zinc-400 group-hover:text-indigo-400">
              Añadir Instancia
            </span>
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-zinc-50 mb-4">Crear Nueva Instancia</h3>

            <form onSubmit={handleCreateInstance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Mi Instancia"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Versión</label>
                {isLoadingVersions ? (
                  <div className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-500 text-sm flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-zinc-600 border-t-indigo-500 rounded-full animate-spin"></span>
                    Cargando versiones...
                  </div>
                ) : (
                  <select
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-50 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {versions.length > 0 ? (
                      versions.map((version) => (
                        <option key={version} value={version}>
                          {version}
                        </option>
                      ))
                    ) : (
                      <option disabled>No versions available</option>
                    )}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 font-medium rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingVersions || versions.length === 0}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstancesView
