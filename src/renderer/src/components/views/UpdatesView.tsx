import React from 'react'

interface ChangelogEntry {
  version: string
  date: string
  title: string
  type: 'major' | 'minor' | 'patch'
  changes: string[]
}

const updates: ChangelogEntry[] = [
  {
    version: 'v1.0.4',
    date: '28 de Abril, 2026',
    title: 'Interfaz y Privacidad',
    type: 'patch',
    changes: [
      'Nueva pestaña de Notas de Versión accesible desde el botón superior.',
      'Optimización de la barra lateral: se eliminó navegación redundante.',
      'Mejoras en la privacidad del usuario en la interfaz.',
      'Corrección de rutas de importación en el componente principal.'
    ]
  },  
  {
    version: 'v1.0.3',
    date: '28 de Abril, 2026',
    title: 'Sistema de Actualizaciones',
    type: 'major',
    changes: [
      'Implementación de GitHub Actions para builds automáticos.',
      'Sistema de auto-update: el launcher ahora detecta nuevas versiones al iniciar.',
      'Instalador oficial de Windows (.exe) generado y firmado.',
      'Corrección de errores en la gestión de dependencias de Node.'
    ]
  },
  {
    version: 'v1.0.2',
    date: '27 de Abril, 2026',
    title: 'Autenticación Segura',
    type: 'minor',
    changes: [
      'Integración con Microsoft Auth (Xbox Live) para cuentas Premium.',
      'Nuevo gestor multi-cuenta: cambia de usuario sin cerrar el launcher.',
      'Sistema de avatars: ahora se muestra la cara de tu skin en la barra lateral.',
      'Mejora en la seguridad de almacenamiento de tokens.'
    ]
  },
  {
    version: 'v1.0.1',
    date: '25 de Abril, 2026',
    title: 'Base Técnica',
    type: 'patch',
    changes: [
      'Soporte inicial para Minecraft Fabric.',
      'Sistema de descarga de librerías y assets optimizado.',
      'Interfaz moderna basada en Tailwind CSS y Zinc Design.'
    ]
  }
]

function UpdatesView(): React.JSX.Element {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-10">
        <h2 className="text-4xl font-bold text-zinc-50 mb-2 flex items-center gap-3">
          Notas de Versión <span className="text-2xl">🥭</span>
        </h2>
        <p className="text-zinc-400 text-lg">
          Sigue el desarrollo de Mango Launcher y descubre las últimas mejoras.
        </p>
      </div>

      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
        {updates.map((update, index) => (
          <div key={update.version} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* El punto en la línea de tiempo */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <span className="text-xs font-bold">{index === 0 ? '✨' : '📦'}</span>
            </div>
            
            {/* Contenido de la tarjeta */}
            <div className="w-[calc(100%-4rem)] md:w-[45%] bg-zinc-900/40 border border-zinc-800 p-6 rounded-xl hover:border-indigo-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-indigo-400 font-bold">{update.version}</div>
                <time className="text-xs text-zinc-500 font-medium">{update.date}</time>
              </div>
              <div className="text-lg font-bold text-zinc-100 mb-3">{update.title}</div>
              <ul className="space-y-2">
                {update.changes.map((change, i) => (
                  <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                    <span className="text-indigo-500 mt-1">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center text-zinc-500 text-sm italic">
        Desarrollado por yisusmango.
      </div>
    </div>
  )
}

export default UpdatesView