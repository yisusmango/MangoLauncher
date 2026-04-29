import React, { useEffect, useRef } from 'react'

interface LogConsoleProps {
  logs: string[]
  isOpen: boolean
  onClose: () => void
}

export default function LogConsole({ logs, isOpen, onClose }: LogConsoleProps): React.JSX.Element | null {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al final cuando llegan logs nuevos
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-zinc-950/90 backdrop-blur-xl border-l border-zinc-800 z-[100] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Cabecera de la Consola */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500 font-mono font-bold text-lg">{'>_'}</span>
          <h3 className="font-bold text-zinc-100 text-sm uppercase tracking-widest">Consola de Minecraft</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Contenedor de Logs */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs custom-scrollbar selection:bg-emerald-500/30"
      >
        {logs.length === 0 ? (
          <div className="text-zinc-600 italic">Esperando inicio del juego...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="mb-1 break-words">
              <span className="text-zinc-500 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
              <span className={
                log.includes('[ERROR]') || log.includes('SEVERE') ? 'text-red-400' :
                log.includes('[LAUNCHER]') ? 'text-indigo-400' :
                log.includes('[WARN]') ? 'text-yellow-400' :
                'text-zinc-300'
              }>
                {log}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer de la Consola */}
      <div className="p-3 bg-zinc-900/80 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
        <span>Mango Terminal v1.0.0</span>
        <span>{logs.length} líneas capturadas</span>
      </div>
    </div>
  )
}