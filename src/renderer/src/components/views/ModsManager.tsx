import { useState, useEffect } from 'react'
import Toast from '../Toast'

interface ModrinthMod {
  project_id: string
  slug: string 
  title: string
  description: string
  icon_url: string
  downloads: number
  author: string
}

interface InstalledMod {
  fileName: string
  isEnabled: boolean
}

interface ModsManagerProps {
  instanceId: string
  instanceVersion: string
  instanceLoader: string
}

function ModsManager({ instanceId, instanceVersion, instanceLoader }: ModsManagerProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'search' | 'installed'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModrinthMod[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [installingMods, setInstallingMods] = useState<Set<string>>(new Set())
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([])
  const [notification, setNotification] = useState<{msg: string, files?: string[]} | null>(null)

  // NUEVO: Verificamos si la instancia soporta mods
  const isVanilla = instanceLoader.toLowerCase() === 'vanilla'

  const loadInstalledMods = async () => {
    if (isVanilla) return; // No perdemos tiempo cargando mods en vanilla
    try {
      // @ts-ignore
      const files = await window.api.getInstalledMods(instanceId)
      setInstalledMods(files)
    } catch (err) {
      console.error('Error al cargar mods instalados', err)
    }
  }

  useEffect(() => {
    loadInstalledMods()
  }, [instanceId])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim() || isVanilla) return

    setIsSearching(true)
    setError(null)
    setResults([])

    try {
      // @ts-ignore
      const data = await window.api.searchMods(query)
      setResults(data)
    } catch (err: any) {
      console.error('Error al buscar mods:', err)
      setError('Hubo un error al buscar los mods. Revisa tu conexión.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleInstall = async (mod: ModrinthMod) => {
    setInstallingMods((prev) => new Set(prev).add(mod.project_id))
    try {
      // @ts-ignore
      const result = await window.api.installMod(mod.project_id, instanceId, instanceVersion, instanceLoader)
      
      if (result.success) {
        await loadInstalledMods()
        const files = result.downloadedFiles || []
        const hasDeps = files.length > 1
        
        setNotification({
          msg: hasDeps ? 'Se han descargado los siguientes mods:' : '¡Mod instalado con éxito!',
          files: files
        })
        
      } else {
        setError(`Error: ${result.message}`)
      }
    } catch (err: any) {
      console.error('Error al instalar:', err)
      setError(`Falló la instalación: ${err.message}`)
    } finally {
      setInstallingMods((prev) => {
        const next = new Set(prev)
        next.delete(mod.project_id)
        return next
      })
    }
  }

  const handleToggleMod = async (fileName: string) => {
    try {
      // @ts-ignore
      const result = await window.api.toggleMod(instanceId, fileName)
      if (result.success) {
        await loadInstalledMods()
      }
    } catch (error) {
      console.error('Error al alternar mod:', error)
    }
  }

  const handleDeleteMod = async (fileName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar ${fileName}?`)) return
    try {
      // @ts-ignore
      const result = await window.api.deleteMod(instanceId, fileName)
      if (result.success) {
        await loadInstalledMods()
      }
    } catch (error) {
      console.error('Error al borrar mod:', error)
    }
  }

  const formatDownloads = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const checkIfInstalled = (mod: ModrinthMod) => {
    const baseName = mod.slug || mod.title.split(' ')[0]
    const normalizedSlug = baseName.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    return installedMods.some(installed => {
      const normalizedFileName = installed.fileName.toLowerCase().replace(/[^a-z0-9]/g, '')
      return normalizedFileName.includes(normalizedSlug)
    })
  }

  // --- RENDERIZADO PARA INSTANCIAS VANILLA ---
  if (isVanilla) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center text-center p-8">
        <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-3xl max-w-md shadow-2xl">
          <div className="text-6xl mb-6 opacity-20">🚫</div>
          <h3 className="text-xl font-bold text-zinc-100 mb-3">Mods no compatibles</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Esta instancia está usando la versión <span className="text-indigo-400 font-bold">Vanilla</span> oficial de Minecraft.
          </p>
          <div className="h-px bg-zinc-800 my-6"></div>
          <p className="text-xs text-zinc-500 italic">
            Para instalar mods desde Modrinth, crea una nueva instancia y selecciona <span className="text-zinc-300 font-semibold">Fabric</span> como Loader.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* CABECERA CON PESTAÑAS Y BOTÓN DE CARPETA */}
      <div className="flex items-center justify-between border-b border-zinc-800 mb-6">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('search')}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'search' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Explorar Mods
            {activeTab === 'search' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('installed')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'installed' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Mis Mods
            <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full">
              {installedMods.length}
            </span>
            {activeTab === 'installed' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full"></div>}
          </button>
        </div>

        <button
          onClick={() => window.api.openModsFolder(instanceId)}
          className="mb-3 p-2 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-indigo-400 rounded-lg transition-all flex items-center gap-2 text-xs group"
          title="Abrir carpeta de mods"
        >
          <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="hidden md:inline">Abrir Carpeta de Mods</span>
        </button>
      </div>

      {activeTab === 'search' && (
        <>
          <form onSubmit={handleSearch} className="flex gap-3 mb-6">
            <input
              type="text"
              placeholder={`Buscar mods para ${instanceLoader} ${instanceVersion}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-zinc-950/50 border border-zinc-800 text-zinc-100 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3 transition-colors placeholder-zinc-600"
            />
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSearching ? <span className="animate-spin text-lg">⏳</span> : <span className="text-lg">🔍</span>}
              Buscar
            </button>
          </form>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {results.length === 0 && !isSearching && !error ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <span className="text-5xl mb-4 text-zinc-800">🧩</span>
                <p>Busca tus mods favoritos en Modrinth</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                {results.map((mod) => {
                  const isInstalling = installingMods.has(mod.project_id)
                  const isInstalled = checkIfInstalled(mod)

                  return (
                    <div key={mod.project_id} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 hover:border-indigo-500/50 transition-all hover:bg-zinc-900/60 group shadow-sm hover:shadow-indigo-500/5">
                      <div className="flex items-start gap-3">
                        {mod.icon_url ? (
                          <img src={mod.icon_url} alt={mod.title} className="w-12 h-12 rounded-lg object-cover bg-zinc-950 shadow-md" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-xl shadow-md text-zinc-600">📦</div>
                        )}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h4 className="font-bold text-zinc-100 truncate text-sm" title={mod.title}>{mod.title}</h4>
                          <p className="text-[11px] text-zinc-500 truncate">por {mod.author}</p>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2 h-8 leading-relaxed" title={mod.description}>
                        {mod.description}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800/50">
                        <span className="text-[10px] font-bold text-zinc-600 flex items-center gap-1.5 uppercase tracking-tight">
                          <span className="text-xs">⬇️</span> {formatDownloads(mod.downloads)}
                        </span>
                        
                        <button 
                          onClick={() => handleInstall(mod)}
                          disabled={isInstalling || isInstalled}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-2 border ${
                            isInstalled
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 cursor-not-allowed'
                              : isInstalling 
                                ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed' 
                                : 'bg-zinc-100 text-zinc-900 border-zinc-100 hover:bg-indigo-500 hover:text-white hover:border-indigo-500'
                          }`}
                        >
                          {isInstalled ? '✓ Instalado' : isInstalling ? '⏳ ...' : 'Instalar'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'installed' && (
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {installedMods.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <span className="text-5xl mb-4 text-zinc-800">📭</span>
              <p>Aún no has instalado ningún mod en esta instancia.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-4">
              {installedMods.map((mod, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    mod.isEnabled 
                      ? 'bg-zinc-900/40 border-zinc-800/60' 
                      : 'bg-zinc-950/40 border-red-900/20 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-xl filter drop-shadow-sm">{mod.isEnabled ? '📦' : '💤'}</span>
                    <div>
                      <p className={`text-sm font-bold ${mod.isEnabled ? 'text-zinc-100' : 'text-zinc-600 line-through'}`}>
                        {mod.fileName.replace('.disabled', '')}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mt-0.5">
                        {mod.isEnabled ? 'Activo' : 'Desactivado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleMod(mod.fileName)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                        mod.isEnabled 
                          ? 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:text-amber-400 hover:border-amber-400/30 hover:bg-amber-400/5' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      {mod.isEnabled ? 'Desactivar' : 'Activar'}
                    </button>

                    <button
                      onClick={() => handleDeleteMod(mod.fileName)}
                      className="p-2 bg-zinc-800/50 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 border border-zinc-700/50 hover:border-red-400/30 rounded-lg transition-all"
                      title="Eliminar permanentemente"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {notification && (
        <Toast 
          message={notification.msg} 
          files={notification.files} 
          onClose={() => setNotification(null)} 
        />
      )}
    </div>
  )
}

export default ModsManager