function DiscoverView(): React.JSX.Element {
  const placeholders = [
    {
      id: 1,
      title: 'Nuevas Mods Populares',
      category: 'Mods',
      icon: '⚙️'
    },
    {
      id: 2,
      title: 'Servidores Recomendados',
      category: 'Servidores',
      icon: '🌐'
    },
    {
      id: 3,
      title: 'Paquetes de Shaders',
      category: 'Gráficos',
      icon: '✨'
    },
    {
      id: 4,
      title: 'Texturpacks Destacados',
      category: 'Texturas',
      icon: '🎨'
    },
    {
      id: 5,
      title: 'Mapas Aventura',
      category: 'Mapas',
      icon: '🗺️'
    },
    {
      id: 6,
      title: 'Datapacks Útiles',
      category: 'Datapacks',
      icon: '📦'
    }
  ]

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-zinc-50 mb-2">Descubrir</h2>
        <p className="text-zinc-400 text-lg">Explora nuevas mods, shaders, mapas y más para tu experiencia de Minecraft</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {placeholders.map((item) => (
          <div
            key={item.id}
            className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 hover:border-indigo-500 hover:bg-zinc-900/80 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl text-indigo-500 group-hover:text-indigo-400 transition-colors">
                {item.icon}
              </div>
              <span className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full">
                {item.category}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-zinc-50 mb-2 group-hover:text-indigo-400 transition-colors">
              {item.title}
            </h3>

            <p className="text-sm text-zinc-400 mb-4">
              Próximamente: Contenido exclusivo y recomendaciones personalizadas para ti.
            </p>

            <button className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors duration-200">
              Explorar
            </button>
          </div>
        ))}
      </div>

      {/* Coming Soon Section */}
      <div className="mt-12 p-8 bg-gradient-to-r from-zinc-900 to-zinc-800/50 border border-zinc-800 rounded-lg text-center">
        <h3 className="text-2xl font-bold text-zinc-50 mb-2">Más Contenido Próximamente</h3>
        <p className="text-zinc-400 mb-4">
          Estamos trabajando en traerte las mejores recomendaciones y el contenido más popular de la comunidad de Minecraft.
        </p>
        <div className="flex items-center justify-center gap-2 text-indigo-400">
          <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
          <span className="text-sm font-medium">En desarrollo</span>
        </div>
      </div>
    </div>
  )
}

export default DiscoverView
