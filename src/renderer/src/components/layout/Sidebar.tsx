import { useState, useEffect } from 'react'

interface SidebarItem {
  id: string
  label: string
  icon: string
  tooltip: string
}

interface SidebarProps {
  activeView: string
  onNavigate: (route: string) => void
  onToggleConsole: () => void // <-- Nueva prop para abrir la consola
  isConsoleOpen: boolean      // <-- Nueva prop para saber si está abierta
}

interface UserAccount {
  type: 'microsoft' | 'offline' | 'premium' // <-- Agrega 'premium' aquí
  username: string
  uuid: string
  access_token?: string
  client_token?: string
  profile?: any
}

interface AuthData {
  selectedId: string | null
  accounts: UserAccount[]
}

const sidebarItems: SidebarItem[] = [
  { id: 'instances', label: 'Instancias', icon: '📦', tooltip: 'Gestionar instancias de juego' },
  { id: 'discover', label: 'Descubrir', icon: '🔍', tooltip: 'Explorar mods y contenido' },
  { id: 'gallery', label: 'Galería', icon: '📸', tooltip: 'Ver capturas de pantalla' },
  { id: 'settings', label: 'Ajustes', icon: '⚙️', tooltip: 'Ajustes de la aplicación' }
]

function Sidebar({ activeView, onNavigate, onToggleConsole, isConsoleOpen }: SidebarProps): React.JSX.Element {
  const [authData, setAuthData] = useState<AuthData>({ selectedId: null, accounts: [] })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [offlineName, setOfflineName] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const activeAccount = authData.accounts.find(a => a.uuid === authData.selectedId)

  useEffect(() => {
    const fetchAuth = async () => {
      // @ts-ignore
      const data = await window.api.getAuthData()
      if (data) setAuthData(data)
    }
    fetchAuth()
  }, [])

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setShowAddForm(false)
    setOfflineName('')
  }

  const handleMicrosoftLogin = async () => {
    setIsLoggingIn(true)
    try {
      // @ts-ignore
      const newData = await window.api.loginMicrosoft()
      if (newData) {
        setAuthData(newData)
        setShowAddForm(false)
      } else {
        alert('Fallo al iniciar sesión. Inténtalo de nuevo.')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleOfflineLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offlineName.trim()) return
    
    setIsLoggingIn(true)
    try {
      // @ts-ignore
      const newData = await window.api.loginOffline(offlineName)
      setAuthData(newData)
      setShowAddForm(false)
      setOfflineName('')
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleSwitchAccount = async (uuid: string) => {
    // @ts-ignore
    const newData = await window.api.switchAccount(uuid)
    setAuthData(newData)
  }

  const handleRemoveAccount = async (uuid: string) => {
    // @ts-ignore
    const newData = await window.api.removeAccount(uuid)
    setAuthData(newData)
    if (newData.accounts.length === 0) setShowAddForm(true)
  }

  const getAvatarUrl = (account: UserAccount, size: number) => {
    const identifier = account.type === 'microsoft' ? account.uuid : account.username
    return `https://mc-heads.net/avatar/${identifier}/${size}`
  }

  return (
    <aside className="w-16 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 gap-2 z-40 relative">
      <button
        onClick={() => onNavigate('updates')}
        className={`w-12 h-12 rounded-lg transition-all duration-200 flex items-center justify-center font-bold text-lg mb-2 group relative ${
          activeView === 'updates'
            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
            : 'bg-zinc-800 text-indigo-400 hover:bg-zinc-700'
        }`}
      >
        🥭
        <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-50 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Notas de Versión
        </span>
      </button>

      <div className="w-8 h-px bg-zinc-800 my-2"></div>

      {sidebarItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group relative ${
            activeView === item.id
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50'
          }`}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-50 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {item.label}
          </span>
        </button>
      ))}

      <div className="flex-1"></div>

      {/* --- NUEVO BOTÓN DE CONSOLA --- */}
      <button
        onClick={onToggleConsole}
        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group relative ${
          isConsoleOpen
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50'
        }`}
      >
        <span className="text-xl font-mono">{'>_'}</span>
        <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-50 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Consola de Logs
        </span>
      </button>

      <div className="w-8 h-px bg-zinc-800 my-2"></div>

      {/* WIDGET DE AVATAR */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group relative ${
          activeAccount 
            ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-900' 
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50'
        }`}
      >
        {activeAccount ? (
          <img 
            src={getAvatarUrl(activeAccount, 48)} 
            alt={activeAccount.username}
            className="w-full h-full rounded-lg object-cover bg-zinc-800"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%2327272a"/></svg>'
            }}
          />
        ) : (
          <span className="text-xl">🔒</span>
        )}
        <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-50 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          {activeAccount ? activeAccount.username : 'Iniciar Sesión'}
        </span>
      </button>

      {/* MODAL DE AUTENTICACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={handleCloseModal}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {authData.accounts.length > 0 && !showAddForm ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-zinc-50">Tus Cuentas</h3>
                </div>
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto pr-1">
                  {authData.accounts.map((acc) => (
                    <div 
                      key={acc.uuid} 
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        acc.uuid === authData.selectedId 
                          ? 'border-indigo-500 bg-indigo-500/10' 
                          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img src={getAvatarUrl(acc, 40)} className="w-10 h-10 rounded bg-zinc-900" alt="avatar" />
                        <div>
                          <p className="font-bold text-zinc-50 leading-tight">{acc.username}</p>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{acc.type}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {acc.uuid !== authData.selectedId && (
                          <button onClick={() => handleSwitchAccount(acc.uuid)} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-50 rounded text-xs font-medium transition-colors">Usar</button>
                        )}
                        <button onClick={() => handleRemoveAccount(acc.uuid)} className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded text-xs transition-colors">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowAddForm(true)} className="w-full py-2.5 border-2 border-dashed border-zinc-700 hover:border-indigo-500 text-zinc-400 hover:text-indigo-400 rounded-lg font-medium transition-colors text-sm">+ Añadir otra cuenta</button>
              </div>
            ) : (
              <div>
                <div className="flex items-center mb-6">
                  {authData.accounts.length > 0 && (
                    <button onClick={() => setShowAddForm(false)} className="text-zinc-400 hover:text-zinc-50 mr-3">←</button>
                  )}
                  <h3 className="text-xl font-bold text-zinc-50">Añadir Cuenta</h3>
                </div>
                <button onClick={handleMicrosoftLogin} disabled={isLoggingIn} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#00a4ef] hover:bg-[#008bc8] text-white font-medium rounded transition-colors mb-6 disabled:opacity-50">
                  <span className="text-xl">🎮</span>
                  {isLoggingIn ? 'Abriendo Xbox...' : 'Login con Microsoft'}
                </button>
                <div className="relative flex items-center py-2 mb-6">
                  <div className="flex-grow border-t border-zinc-800"></div>
                  <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs uppercase tracking-wider">O juega offline</span>
                  <div className="flex-grow border-t border-zinc-800"></div>
                </div>
                <form onSubmit={handleOfflineLogin}>
                  <input
                    type="text"
                    value={offlineName}
                    onChange={(e) => setOfflineName(e.target.value)}
                    placeholder="Nombre de Usuario (Offline)"
                    disabled={isLoggingIn}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors mb-4"
                  />
                  <button type="submit" disabled={isLoggingIn || !offlineName.trim()} className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-50 text-sm font-medium rounded transition-colors">Entrar Offline</button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar