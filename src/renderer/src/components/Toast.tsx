import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  files?: string[]
  onClose: () => void
}

export default function Toast({ message, files, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Iniciar animación de salida un poco antes de cerrar
    const exitTimer = setTimeout(() => setIsExiting(true), 2700)
    const closeTimer = setTimeout(onClose, 3000) 

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(closeTimer)
    }
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out ${
      isExiting ? 'opacity-0 translate-x-10' : 'animate-in fade-in slide-in-from-right-8'
    }`}>
      <div className="bg-zinc-900 border border-zinc-800 shadow-2xl rounded-xl p-4 min-w-[300px] max-w-[380px] backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg text-lg flex-shrink-0">
            ✅
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-zinc-100">{message}</h4>
            
            {files && files.length > 0 && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {files.map((file, i) => (
                  <div key={i} className="text-[10px] text-zinc-400 font-mono bg-zinc-950/50 p-1.5 rounded border border-zinc-800/30 flex items-center gap-2">
                    <span className="text-emerald-500/50">+</span>
                    <span className="truncate">{file}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}