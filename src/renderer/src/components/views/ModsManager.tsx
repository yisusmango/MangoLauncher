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
  versions?: string[]
  categories?: string[]
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
  const [selectedMod, setSelectedMod] = useState<ModrinthMod | null>(null)
  
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

  const normalizeLoader = (loader: string) => {
    const value = loader.toLowerCase()
    if (value.includes('fabric')) return 'fabric'
    if (value.includes('quilt')) return 'quilt'
    if (value.includes('forge')) return 'forge'
    if (value.includes('neoforge')) return 'neoforge'
    if (value.includes('babric')) return 'babric'
    return 'fabric'
  }

  const normalizeVersion = (version: string) => {
    const versionMap: Record<string, string> = {
      '26.1': '1.21.1'
    }
    return versionMap[version] || version
  }

  const performSearch = async (searchTerm: string) => {
    if (isVanilla) {
      setResults([])
      setSelectedMod(null)
      return
    }

    const trimmed = searchTerm.trim()
    setIsSearching(true)
    setError(null)
    setResults([])

    try {
      // @ts-ignore
      const data = await window.api.searchMods(trimmed, instanceVersion, instanceLoader)
      setResults(data)
      setSelectedMod(null)
    } catch (err: any) {
      console.error('Error al buscar mods:', err)
      setError('Hubo un error al buscar los mods. Revisa tu conexión.')
      setSelectedMod(null)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    await performSearch(query)
  }

  const handleSelectMod = (mod: ModrinthMod) => {
    setSelectedMod(mod)
  }

  useEffect(() => {
    if (isVanilla) return
    const trimmed = query.trim()
    const timer = setTimeout(() => {
      performSearch(trimmed)
    }, 350)

    return () => clearTimeout(timer)
  }, [query, instanceVersion, instanceLoader, isVanilla])

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
        <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-none max-w-md shadow-2xl">
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-6 ml-4 items-center">
          <button 
            onClick={() => setActiveTab('search')}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'search' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Explorar Mods
            {activeTab === 'search' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('installed')}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'installed' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Mis Mods
            <span className="text-[10px] font-semibold text-indigo-300 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-none min-w-[1.4rem] text-center">
              {installedMods.length}
            </span>
            {activeTab === 'installed' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>}
          </button>
        </div>

        <button
          onClick={() => window.api.openModsFolder(instanceId)}
          className="mb-3 p-2 bg-transparent hover:bg-zinc-900/50 text-zinc-400 hover:text-indigo-400 rounded-none transition-all flex items-center gap-2 text-xs group"
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
          <form onSubmit={handleSearch} className="mb-6">
            <input
              type="text"
              placeholder={`Buscar mods para ${instanceLoader} ${instanceVersion}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-950/50 border border-zinc-800 text-zinc-100 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 transition-colors placeholder-zinc-600"
            />
          </form>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-none mb-6 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col gap-4">
            <div className="flex-1 min-h-0 overflow-hidden border border-zinc-800 bg-zinc-950/50 flex flex-col lg:flex-row">
              <aside className="w-full lg:w-1/2 xl:w-2/5 h-full min-h-0 border-b border-zinc-800 lg:border-b-0 lg:border-r border-zinc-800 overflow-y-auto custom-scrollbar p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-zinc-500 mb-4">
                  {query.trim().length === 0 ? 'Resultados populares' : 'Resultados'}
                </div>

                {results.length === 0 && !isSearching && !error ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                    <span className="text-5xl mb-4 text-zinc-800">🧩</span>
                    <p>{query.trim().length === 0 ? 'Cargando mods populares...' : 'Busca tus mods favoritos en Modrinth'}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pb-4">
                    {results.map((mod) => {
                      const compatibleVersion = mod.versions?.includes(normalizeVersion(instanceVersion)) ?? true
                      const compatibleLoader = mod.categories?.includes(normalizeLoader(instanceLoader)) ?? true
                      if (!compatibleVersion || !compatibleLoader) return null

                      const isSelected = selectedMod?.project_id === mod.project_id
                      const isInstalledResult = checkIfInstalled(mod)

                      return (
                        <button
                          key={mod.project_id}
                          onClick={() => handleSelectMod(mod)}
                          className={`w-full text-left rounded-none border transition-all p-3 flex items-start gap-3 ${
                            isSelected
                              ? 'border-indigo-500/40 bg-indigo-500/10'
                              : isInstalledResult
                                ? 'border-l-4 border-emerald-400/30 bg-emerald-400/5 hover:border-emerald-400/50 hover:bg-emerald-500/5'
                                : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-600 hover:bg-zinc-900/90'
                          }`}
                        >
                          {mod.icon_url ? (
                            <img src={mod.icon_url} alt={mod.title} className="w-12 h-12 rounded-none object-cover bg-zinc-950 shadow-md" />
                          ) : (
                            <div className="w-12 h-12 rounded-none bg-zinc-800 flex items-center justify-center text-xl shadow-md text-zinc-600">📦</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-zinc-100 truncate" title={mod.title}>{mod.title}</h4>
                            <p className="text-[11px] text-zinc-500 truncate">por {mod.author}</p>
                            <p className="text-[11px] text-zinc-400 line-clamp-2 mt-2" title={mod.description}>{mod.description}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </aside>

              <section className="flex-1 h-full min-h-0 p-4 overflow-y-auto custom-scrollbar">
                {selectedMod ? (
                  <div className="flex flex-col h-full gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {selectedMod.icon_url ? (
                        <img src={selectedMod.icon_url} alt={selectedMod.title} className="w-24 h-24 rounded-none object-cover bg-zinc-950 shadow-xl" />
                      ) : (
                        <div className="w-24 h-24 rounded-none bg-zinc-800 flex items-center justify-center text-4xl text-zinc-500">📦</div>
                      )}
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 items-center mb-3">
                          <span className="text-xs uppercase tracking-[0.28em] text-zinc-500">Modrinth</span>
                          <span className="text-xs text-zinc-400 bg-zinc-900/70 rounded-none px-2 py-1">{instanceLoader} {instanceVersion}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-100 leading-tight">{selectedMod.title}</h2>
                        <p className="text-sm text-zinc-400 mt-2">por <span className="text-zinc-200">{selectedMod.author}</span></p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-none bg-zinc-900/80 border border-zinc-800 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">Descripción</p>
                        <p className="text-sm leading-6 text-zinc-300 whitespace-pre-wrap">{selectedMod.description}</p>
                      </div>
                      <div className="rounded-none bg-zinc-900/80 border border-zinc-800 p-4 space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Descargas</p>
                          <p className="text-sm text-zinc-200">{formatDownloads(selectedMod.downloads)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Compatibilidad</p>
                          <p className="text-sm text-zinc-200">{normalizeVersion(instanceVersion)} / {normalizeLoader(instanceLoader)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Enlace</p>
                          <a href={`https://modrinth.com/mod/${selectedMod.slug}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm break-all">modrinth.com/mod/{selectedMod.slug}</a>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        onClick={() => handleInstall(selectedMod)}
                        disabled={installingMods.has(selectedMod.project_id) || checkIfInstalled(selectedMod)}
                        className={`w-full sm:w-auto px-5 py-3 rounded-none text-sm font-semibold transition-all ${
                          checkIfInstalled(selectedMod)
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-not-allowed'
                            : installingMods.has(selectedMod.project_id)
                              ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                              : 'bg-indigo-500 text-white hover:bg-indigo-400'
                        }`}
                      >
                        {checkIfInstalled(selectedMod) ? '✓ Instalado' : installingMods.has(selectedMod.project_id) ? '⏳ Instalando...' : 'Instalar mod'}
                      </button>
                      <div className="text-sm text-zinc-400">
                        Haz clic en cualquier mod de la lista para ver más detalles.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                    <span className="text-5xl mb-4">📦</span>
                    <p className="text-sm">Selecciona un mod para ver la descripción en esta sección.</p>
                  </div>
                )}
              </section>
            </div>
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
                  className={`flex items-center justify-between p-3.5 rounded-none border transition-all ${
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
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-none transition-all border ${
                        mod.isEnabled 
                          ? 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:text-amber-400 hover:border-amber-400/30 hover:bg-amber-400/5' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      {mod.isEnabled ? 'Desactivar' : 'Activar'}
                    </button>

                    <button
                      onClick={() => handleDeleteMod(mod.fileName)}
                      className="p-2 bg-zinc-800/50 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 border border-zinc-700/50 hover:border-red-400/30 rounded-none transition-all"
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