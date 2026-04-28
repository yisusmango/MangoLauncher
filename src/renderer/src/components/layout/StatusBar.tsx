interface StatusBarProps {
  currentUser: string
  downloadProgress: number
  downloadSpeed?: string
  downloadPhase?: string
  isDownloading?: boolean
}

function StatusBar({ currentUser, downloadProgress, downloadSpeed, downloadPhase, isDownloading }: StatusBarProps): React.JSX.Element {
  // Ahora usamos la señal exacta del backend para saber si debemos mostrar la barra
  const showProgressBar = isDownloading;

  return (
    <footer className="bg-zinc-900 border-t border-zinc-800 px-6 py-3 flex items-center justify-between">
      {/* Left Side - User Info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
          {currentUser.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-zinc-50">{currentUser}</span>
          <span className="text-xs text-zinc-500">Online</span>
        </div>
      </div>

      {/* Center - Download Progress */}
      {showProgressBar && (
        <div className="flex items-center gap-4 flex-1 mx-8">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
            <span className="text-xs text-zinc-400 font-medium min-w-max">{downloadProgress}%</span>
          </div>
          {downloadSpeed && (
            <span className="text-xs text-zinc-300 font-medium min-w-max">{downloadSpeed}</span>
          )}
        </div>
      )}

      {/* Right Side - Status Info */}
      <div className="flex items-center gap-4">
        {showProgressBar ? (
          <span className="text-xs text-indigo-400 animate-pulse">
            {downloadPhase || 'Descargando...'}
          </span>
        ) : (
          <span className="text-xs text-zinc-500">Listo</span>
        )}
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${showProgressBar ? 'bg-indigo-500' : 'bg-green-500'} animate-pulse`}></div>
          <span className="text-xs text-zinc-400">v1.0.0</span>
        </div>
      </div>
    </footer>
  )
}

export default StatusBar