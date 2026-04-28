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
}

function getLoaderColor(loader: string): string {
  switch (loader) {
    case 'Vanilla':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'Fabric':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'Forge':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    default:
      return 'bg-zinc-700/20 text-zinc-400 border-zinc-700/30'
  }
}

function InstanceCard({ instance, onDelete }: InstanceCardProps): React.JSX.Element {
  const [isHovered, setIsHovered] = useState<boolean>(false)
  const loaderColorClass = getLoaderColor(instance.loader)

  const formattedPlaytime =
    instance.playtime >= 24
      ? `${Math.floor(instance.playtime / 24)}d ${instance.playtime % 24}h`
      : `${instance.playtime}h`

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-full group"
    >
      {/* Botón de Borrar - Separado y con Z-Index altísimo (50) */}
      <div className="absolute top-2 right-2 z-50">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(instance.id)
          }}
          className="p-1.5 rounded-md bg-zinc-950/90 text-zinc-400 hover:text-white hover:bg-red-600 transition-colors duration-200 shadow-sm"
          title="Borrar instancia"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Contenedor Principal de la Tarjeta */}
      <div
        className={`w-full h-48 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between transition-all duration-200 ${
          isHovered ? 'border-indigo-500 bg-zinc-900/80' : ''
        }`}
      >
        {/* Header con Icono y Nombre */}
        <div className="flex items-start justify-between pr-8">
          <div className="flex flex-col items-start flex-1">
            <div className="text-3xl mb-2">{instance.icon || '📦'}</div>
            <h3 className="text-sm font-semibold text-zinc-50 line-clamp-2">
              {instance.name}
            </h3>
          </div>
        </div>

        {/* Metadatos */}
        <div className="flex flex-col gap-2">
          {/* Badge de Versión */}
          <div className="flex items-center gap-2">
            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700">
              {instance.version}
            </span>
          </div>

          {/* Badge de Loader */}
          <div className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${loaderColorClass} w-fit`}>
            <span className="font-medium">{instance.loader || 'Vanilla'}</span>
          </div>

          {/* Playtime */}
          <div className="text-xs text-zinc-500">
            <span>⏱️ {formattedPlaytime}</span>
          </div>
        </div>
      </div>

      {/* Overlay de Jugar - Con Z-Index bajo (10) para no tapar la X de borrar */}
      <div
        className={`absolute inset-0 bg-zinc-950/80 z-10 flex items-center justify-center rounded-lg transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            // @ts-ignore
            window.api.launchInstance(instance)
          }}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-lg"
        >
          <span>▶</span>
          Jugar
        </button>
      </div>
    </div>
  )
}

export default InstanceCard