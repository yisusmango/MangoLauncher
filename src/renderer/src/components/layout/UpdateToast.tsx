import React from 'react'

interface UpdateToastProps {
  version: string
  isReady: boolean
  onAction: () => void
  onDismiss: () => void
}

export default function UpdateToast({ version, isReady, onAction, onDismiss }: UpdateToastProps): React.JSX.Element {
  return (
    <div className="fixed top-6 right-6 bg-zinc-900 border border-indigo-500/50 p-4 rounded-xl shadow-2xl z-[100] animate-in fade-in slide-in-from-top-4 duration-300 w-80">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🥭</span>
        <div>
          <h4 className="text-sm font-bold text-zinc-50">
            {isReady ? '¡Actualización Lista!' : 'Nueva Actualización'}
          </h4>
          <p className="text-xs text-zinc-400">
            {isReady 
              ? `La versión ${version} está lista para instalarse.` 
              : `La versión ${version} ya está disponible.`}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={onAction}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
        >
          {isReady ? 'Reiniciar ahora' : 'Descargar ahora'}
        </button>
        <button 
          onClick={onDismiss}
          className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {isReady ? 'Más tarde' : 'Ignorar'}
        </button>
      </div>
    </div>
  )
}