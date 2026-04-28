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
}

// Nueva interfaz para la cuenta que lee desde Node.js
interface UserAccount {
  type: 'microsoft' | 'offline'
  username: string
  uuid: string
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'instances',
    label: 'Instancias',
    icon: '📦',
    tooltip: 'Manage game instances'
  },
  {
    id: 'discover',
    label: 'Descubrir',
    icon: '🔍',
    tooltip: 'Discover mods and content'
  },
  {
    id: 'settings',
    label: 'Ajustes',
    icon: '⚙️',
    tooltip: 'Application settings'
  }
]

function Sidebar({ activeView, onNavigate }: SidebarProps): React.JSX.Element {
  // Estados para controlar el Login
  const [account, setAccount] = useState<UserAccount | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [offlineName, setOfflineName] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Cargar la sesión apenas se abre el launcher
  useEffect(() => {
    const fetchAccount = async () => {
      // @ts-ignore
      const currentAccount = await window.api.getAccount()
      if (currentAccount) setAccount(currentAccount)
    }
    fetchAccount()
  }, [])

  const handleItemClick = (itemId: string): void => {
    onNavigate(itemId)
  }

  // Funciones de conexión con el Backend
  const handleMicrosoftLogin = async () => {
    setIsLoggingIn(true)
    try {
      // @ts-ignore
      const newAccount = await window.api.loginMicrosoft()
      if (newAccount) {
        setAccount(newAccount)
        setIsModalOpen(false)
      } else {
        alert('Fallo al iniciar sesión con Microsoft. Cierra la ventana y vuelve a intentarlo.')
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
      const newAccount = await window.api.loginOffline(offlineName)
      setAccount(newAccount)
      setIsModalOpen(false)
      setOfflineName('')
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    // @ts-ignore
    const success = await window.api.logout()
    if (success) {
      setAccount(null)
      setIsModalOpen(false)
    }
  }

  return (
    <aside className="w-16 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 gap-2 z-40 relative">
      {/* Logo/Home Button */}
      <button
        onClick={() => handleItemClick('instances')}
        className="w-12 h-12 rounded-lg bg-indigo-500 hover:bg-indigo-600 transition-colors duration-200 flex items-center justify-center text-white font-bold text-lg mb-2 group relative"
        title="Home"
      >
        M
        <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-50 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Mango Launcher
        </span>
      </button>

      <div className="w-8 h-px bg-zinc-800 my-2"></div>

      {/* Navigation Items */}
      {sidebarItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleItemClick(item.id)}
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group relative ${
            activeView === item.id
              ? 'bg-indigo-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50'
          }`}
          title={item.tooltip}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-50 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {item.label}
          </span>
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1"></div>

      <div className="w-8 h-px bg-zinc-800 my-2"></div>

      {/* WIDGET DE PERFIL (Sustituye al botón de ayuda) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group relative ${
          account 
            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' 
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50'
        }`}
      >
        <span className="text-xl">{account ? '👤' : '🔒'}</span>
        <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-50 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          {account ? account.username : 'Iniciar Sesión'}
        </span>
      </button>

      {/* MODAL DE AUTENTICACIÓN */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setIsModalOpen(false)} // Cierra al hacer clic fuera
        >
          <div 
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Evita que se cierre al hacer clic dentro
          >
            {account ? (
              /* --- VISTA: USUARIO CONECTADO --- */
              <div className="text-center">
                <div className="w-20 h-20 bg-zinc-800 rounded-full mx-auto flex items-center justify-center text-4xl mb-4 border-2 border-emerald-500">
                  👤
                </div>
                <h3 className="text-xl font-bold text-zinc-50 mb-1">{account.username}</h3>
                <p className="text-sm text-zinc-400 mb-6">
                  Cuenta: <span className="text-indigo-400">{account.type === 'microsoft' ? 'Premium (Microsoft)' : 'Offline'}</span>
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 font-medium rounded transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              /* --- VISTA: INICIAR SESIÓN --- */
              <div>
                <h3 className="text-2xl font-bold text-zinc-50 mb-6 text-center">Identifícate</h3>

                {/* Botón Microsoft */}
                <button
                  onClick={handleMicrosoftLogin}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#00a4ef] hover:bg-[#008bc8] text-white font-medium rounded transition-colors mb-6 disabled:opacity-50"
                >
                  <span className="text-xl">🎮</span>
                  {isLoggingIn ? 'Abriendo Xbox...' : 'Login con Microsoft'}
                </button>

                <div className="relative flex items-center py-2 mb-6">
                  <div className="flex-grow border-t border-zinc-800"></div>
                  <span className="flex-shrink-0 mx-4 text-zinc-500 text-sm">O juega sin conexión</span>
                  <div className="flex-grow border-t border-zinc-800"></div>
                </div>

                {/* Formulario Offline */}
                <form onSubmit={handleOfflineLogin}>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={offlineName}
                    onChange={(e) => setOfflineName(e.target.value)}
                    placeholder="Ej: yisusmango"
                    disabled={isLoggingIn}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors mb-4"
                  />
                  <button
                    type="submit"
                    disabled={isLoggingIn || !offlineName.trim()}
                    className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 border border-zinc-700 text-zinc-50 font-medium rounded transition-colors"
                  >
                    Entrar Offline
                  </button>
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