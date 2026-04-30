import { useEffect, useState } from 'react'
import ModsManager from './ModsManager'

interface ModsManagerParams {
  instanceId: string
  instanceName: string
  version: string
  loader: string
}

function parseHashParams(): ModsManagerParams {
  const hash = window.location.hash.replace(/^#/, '')
  const [, query = ''] = hash.split('?')
  const params = new URLSearchParams(query)

  return {
    instanceId: params.get('instanceId') || '',
    instanceName: params.get('instanceName') || '',
    version: params.get('version') || '',
    loader: params.get('loader') || ''
  }
}

function ModsManagerWindow(): React.JSX.Element {
  const [instanceId, setInstanceId] = useState('')
  const [instanceName, setInstanceName] = useState('')
  const [instanceVersion, setInstanceVersion] = useState('')
  const [instanceLoader, setInstanceLoader] = useState('')

  useEffect(() => {
    const { instanceId, instanceName, version, loader } = parseHashParams()
    setInstanceId(instanceId)
    setInstanceName(instanceName)
    setInstanceVersion(version)
    setInstanceLoader(loader)
  }, [])

  const handleClose = () => {
    window.close()
  }

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-zinc-200 overflow-hidden select-none">
      <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 drag-region">
        <div>
          <h3 className="text-xl font-bold text-zinc-50 flex items-center gap-3">
            <span className="text-indigo-400">🧩</span>
            Gestor de Mods
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Instancia {instanceName || instanceId} • {instanceLoader} {instanceVersion}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="text-zinc-500 hover:text-white transition-colors p-1 no-drag rounded-md hover:bg-red-500/20"
          title="Cerrar gestor de mods"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-hidden p-5">
        {instanceId && instanceVersion && instanceLoader ? (
          <div className="h-full border border-zinc-800 bg-zinc-950/50 overflow-hidden">
            <ModsManager 
              instanceId={instanceId}
              instanceVersion={instanceVersion}
              instanceLoader={instanceLoader}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center px-6">
            <div>
              <p className="text-lg text-zinc-300 mb-3">No se encontraron los datos de la instancia.</p>
              <p className="text-sm text-zinc-500">Intenta cerrar y volver a abrir el gestor desde la lista de instancias.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModsManagerWindow
