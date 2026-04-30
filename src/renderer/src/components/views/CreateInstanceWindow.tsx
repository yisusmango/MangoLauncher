import { useState, useEffect } from 'react'

interface CreateInstanceFormData {
  name: string
  version: string
  loader: string
  loaderVersion: string 
}

interface FabricLoaderVersion {
  version: string
  stable: boolean
  date?: string
}

function CreateInstanceWindow(): React.JSX.Element {
  const [formData, setFormData] = useState<CreateInstanceFormData>({
    name: '',
    version: '',
    loader: 'Vanilla',
    loaderVersion: ''
  })
  
  const [versions, setVersions] = useState<string[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(true)
  
  const [fabricVersions, setFabricVersions] = useState<FabricLoaderVersion[]>([])
  const [isLoadingFabric, setIsLoadingFabric] = useState<boolean>(false)

  useEffect(() => {
    const loadVersions = async (): Promise<void> => {
      try {
        // @ts-ignore
        const fetchedVersions = await window.api.getMinecraftVersions()
        setVersions(fetchedVersions)
        if (fetchedVersions.length > 0) {
          setFormData(prev => ({ ...prev, version: fetchedVersions[0] }))
        }
      } catch (error) {
        console.error('Error loading versions:', error)
      } finally {
        setIsLoadingVersions(false)
      }
    }
    loadVersions()
  }, [])

  useEffect(() => {
    if (formData.loader === 'Fabric' && fabricVersions.length === 0) {
      const fetchFabric = async () => {
        setIsLoadingFabric(true)
        try {
          const [resMeta, resGithub] = await Promise.all([
            fetch('https://meta.fabricmc.net/v2/versions/loader'),
            fetch('https://api.github.com/repos/FabricMC/fabric-loader/releases?per_page=100')
          ])

          if (!resMeta.ok) throw new Error('Error Meta Fabric')
          
          const metaData: any[] = await resMeta.json()
          let dateMap: Record<string, string> = {}

          if (resGithub.ok) {
            const ghData = await resGithub.json()
            ghData.forEach((release: any) => {
              const ver = release.tag_name.replace('v', '')
              dateMap[ver] = new Date(release.published_at).toLocaleDateString('es-MX', {
                year: 'numeric', month: 'short', day: 'numeric'
              })
            })
          }

          const data: FabricLoaderVersion[] = metaData.map(v => ({
            version: v.version,
            stable: v.stable,
            date: dateMap[v.version] || 'Fecha desconocida'
          }))

          setFabricVersions(data)
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, loaderVersion: data[0].version }))
          }
        } catch (error) {
          console.warn('Fallback Fabric:', error)
          const fallbackVersions: FabricLoaderVersion[] = [
            { version: '0.16.5', stable: true, date: '11 sep 2024' },
            { version: '0.15.11', stable: true, date: '11 may 2024' }
          ]
          setFabricVersions(fallbackVersions)
          setFormData(prev => ({ ...prev, loaderVersion: fallbackVersions[0].version }))
        } finally {
          setIsLoadingFabric(false)
        }
      }
      fetchFabric()
    }
  }, [formData.loader, fabricVersions.length])

  const handleCancel = () => {
    // @ts-ignore
    window.api.closeCreateInstanceWindow()
  }

  const handleCreateInstance = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
    // Si el nombre está vacío, el launcher usa la versión seleccionada automáticamente
    const finalName = formData.name.trim() || formData.version

    try {
      // @ts-ignore
      await window.api.createInstance({
        name: finalName,
        version: formData.version,
        loader: formData.loader,
        loaderVersion: formData.loader === 'Fabric' ? formData.loaderVersion : undefined,
        icon: formData.loader === 'Fabric' ? '🧶' : '📦'
      })
    } catch (error) {
      console.error('Error creating instance:', error)
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 overflow-hidden select-none">
      <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 drag-region">
        <h3 className="text-xl font-bold text-zinc-50 flex items-center gap-2">
          <span className="text-indigo-500">✨</span> Configurar Instancia
        </h3>
        <button 
          onClick={handleCancel}
          className="text-zinc-500 hover:text-white transition-colors p-1 no-drag rounded-md hover:bg-red-500/20"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 border-r border-zinc-800 bg-zinc-900/30 flex flex-col p-3 gap-1">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-3 mb-2 mt-2">Plataforma</div>
          <button
            onClick={() => setFormData(prev => ({ ...prev, loader: 'Vanilla' }))}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              formData.loader === 'Vanilla' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-zinc-400 hover:bg-zinc-800/50 border border-transparent'
            }`}
          >
            <span className="text-lg">📦</span> Vanilla
          </button>
          <button
            onClick={() => setFormData(prev => ({ ...prev, loader: 'Fabric' }))}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              formData.loader === 'Fabric' 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                : 'text-zinc-400 hover:bg-zinc-800/50 border border-transparent'
            }`}
          >
            <span className="text-lg">🧶</span> Fabric
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col bg-zinc-950 overflow-hidden">
          <div className="mb-6 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Nombre de la Instancia</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={formData.version}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-4 py-2.5 text-zinc-50 focus:outline-none focus:border-indigo-500 transition-colors text-lg shadow-inner placeholder:opacity-30"
              autoFocus
            />
          </div>

          <div className="flex flex-1 gap-6 min-h-0">
            <div className="flex flex-col flex-1">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Versión de Minecraft</label>
              <div className="flex-1 border border-zinc-800 rounded-lg bg-zinc-900/30 overflow-y-auto custom-scrollbar">
                {isLoadingVersions ? (
                  <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Cargando versiones...</div>
                ) : (
                  <div className="flex flex-col">
                    {versions.map((v) => (
                      <button
                        key={v}
                        onClick={() => setFormData(prev => ({ ...prev, version: v }))}
                        className={`flex items-center justify-between px-4 py-2 border-b border-zinc-800/50 text-sm transition-colors text-left ${
                          formData.version === v 
                            ? 'bg-indigo-600 text-white sticky top-0 bottom-0 z-10 shadow-md' 
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <span>{v}</span>
                        {formData.version === v && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {formData.loader === 'Fabric' && (
              <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  Versión del Loader
                  {isLoadingFabric && <span className="text-indigo-400 normal-case text-xs animate-pulse">Cargando...</span>}
                </label>
                <div className="flex-1 border border-zinc-800 rounded-lg bg-zinc-900/30 overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col">
                    {fabricVersions.map((fv) => (
                      <button
                        key={fv.version}
                        onClick={() => setFormData(prev => ({ ...prev, loaderVersion: fv.version }))}
                        className={`flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50 text-sm transition-colors text-left ${
                          formData.loaderVersion === fv.version 
                            ? 'bg-blue-600 text-white sticky top-0 bottom-0 z-10 shadow-md' 
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{fv.version}</span>
                            {fv.stable && <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase font-bold">Estable</span>}
                          </div>
                          <span className={`text-[10px] ${formData.loaderVersion === fv.version ? 'text-blue-100' : 'text-zinc-500'}`}>
                            {fv.date}
                          </span>
                        </div>
                        {formData.loaderVersion === fv.version && <span className="text-lg">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/80">
        <button
          onClick={handleCancel}
          className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleCreateInstance}
          disabled={isLoadingVersions || !formData.version}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          ✓ Crear Instancia
        </button>
      </div>
    </div>
  )
}

export default CreateInstanceWindow