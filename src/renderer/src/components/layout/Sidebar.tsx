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
  const handleItemClick = (itemId: string): void => {
    onNavigate(itemId)
  }

  return (
    <aside className="w-16 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 gap-2">
      {/* Logo/Home Button */}
      <button
        onClick={() => handleItemClick('instances')}
        className="w-12 h-12 rounded-lg bg-indigo-500 hover:bg-indigo-600 transition-colors duration-200 flex items-center justify-center text-white font-bold text-lg mb-2 group relative"
        title="Home"
      >
        Λ
        <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-50 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Home
        </span>
      </button>

      {/* Divider */}
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

      {/* Bottom Icons */}
      <div className="w-8 h-px bg-zinc-800 my-2"></div>

      {/* Help/Support Button */}
      <button
        className="w-12 h-12 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50 flex items-center justify-center transition-all duration-200 group relative"
        title="Help"
      >
        <span className="text-lg">❓</span>
        <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-50 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Help
        </span>
      </button>
    </aside>
  )
}

export default Sidebar
