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
    version: 'v1.0.9',
    date: '29 de Abril, 2026',
    title: 'Mantenimiento Técnico y Ventanas Nativas',
    type: 'minor',
    changes: [
      'Implementación de Log Cleaner individual: ahora puedes borrar los archivos .log.gz de cada instancia para liberar espacio en disco.',
      'Sistema de Playtime funcional: el launcher ahora registra y acumula con precisión el tiempo de juego por sesión en cada instancia.',
      'Nuevo creador de instancias en ventana nativa: interfaz panorámica de 1050px independiente para una mejor gestión visual.',
      'Nombrado automático inteligente: si no asignas un nombre, la instancia toma el de la versión de Minecraft seleccionada (estilo Prism).',
      'Integración total con Fabric: consulta en tiempo real a Meta Fabric y GitHub para mostrar versiones y fechas de lanzamiento exactas.',
      'Refactorización estética: placeholder dinámico con opacidad reducida en el campo de nombre para guiar la creación.',
      'Navegación independiente: sistema de ruteo por Hash (#/create-instance) para manejar múltiples procesos de ventana.'
    ]
  },
  {
    version: 'v1.0.8',
    date: '28 de Abril, 2026',
    title: 'Galería de Capturas y Motor de Imágenes',
    type: 'minor',
    changes: [
      'Implementación del Screenshots Manager: visualiza tus capturas de Minecraft directamente desde el launcher.',
      'Nuevo protocolo nativo "mango-file": carga optimizada de imágenes locales sin restricciones de seguridad de Chromium.',
      'Sistema de reparación de rutas en Windows para asegurar la carga correcta de archivos desde AppData.',
      'Gestión de archivos: botones dedicados para borrar capturas y abrir la carpeta de screenshots en el explorador.',
      'Mejora en Discord RPC: estado dinámico "Viendo sus Capturas" al navegar por la galería.'
    ]
  },  
  {
    version: 'v1.0.7',
    date: '28 de Abril, 2026',
    title: 'Discord Rich Presence: Conectando a los Panas',
    type: 'minor',
    changes: [
      'Integración nativa con Discord Rich Presence (RPC) para mostrar tu estado en tiempo real.',
      'Estados dinámicos al navegar: Discord ahora muestra si estás configurando el motor, explorando mods o gestionando instancias.',
      'Telemetría de juego en vivo: Al abrir Minecraft, tu perfil mostrará el nombre de la instancia, la versión exacta y el modloader (Vanilla/Fabric).',
      'Integración del icono oficial de Mango Launcher en el perfil de usuario de Discord.'
    ]
  },  
  {
    version: 'v1.0.6',
    date: '28 de Abril, 2026',
    title: 'Telemetría y Control Total',
    type: 'major',
    changes: [
      'Implementación de Mango Terminal: Consola de logs en tiempo real para monitorear el arranque de Minecraft y detectar errores de mods.',
      'Nuevo sistema de notificaciones "Mango Toast" para actualizaciones de la aplicación, eliminando ventanas nativas del sistema.',
      'Panel lateral expandido con acceso directo a la consola técnica (>_).',
      'Optimización del consumo de memoria al limitar el historial de logs en el frontend.',
      'Mejoras en el auto-scroll de la terminal y resaltado de errores en color rojo.'
    ]
  },  
  {
    version: 'v1.0.5',
    date: '28 de Abril, 2026',
    title: 'Interfaz',
    type: 'patch',
    changes: [
      'Nuevo dialogo para el autoupdater.',
    ]
  },  
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