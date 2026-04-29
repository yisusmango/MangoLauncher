import { useState, useEffect } from 'react'

interface SettingsState {
  javaMinMemory: string
  javaMaxMemory: string
  theme: string
  autoUpdate: boolean
}

function SettingsView(): React.JSX.Element {
  const [settings, setSettings] = useState<SettingsState>({
    javaMinMemory: '2',
    javaMaxMemory: '4',
    theme: 'dark',
    autoUpdate: true
  })

  // NUEVO: Cargar configuración al abrir la vista
  useEffect(() => {
    const loadSettings = async () => {
      // @ts-ignore
      const savedSettings = await window.api.getSettings()
      if (savedSettings) setSettings(savedSettings)
    }
    loadSettings()
  }, [])

  // NUEVO: Función maestra para autoguardar
  const saveAndApplySettings = async (newSettings: SettingsState) => {
    setSettings(newSettings)
    // @ts-ignore
    await window.api.saveSettings(newSettings)
  }

  const handleMemoryChange = (type: 'min' | 'max', value: string): void => {
    const newSettings = {
      ...settings,
      [type === 'min' ? 'javaMinMemory' : 'javaMaxMemory']: value
    }
    saveAndApplySettings(newSettings)
  }

  const handleToggle = (setting: string): void => {
    const newSettings = {
      ...settings,
      [setting]: !settings[setting as keyof SettingsState]
    }
    saveAndApplySettings(newSettings)
  }

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSettings = { ...settings, theme: e.target.value }
    saveAndApplySettings(newSettings)
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-zinc-50 mb-2">Ajustes</h2>
        <p className="text-zinc-400">Configura tu experiencia de Minecraft Launcher</p>
      </div>

      {/* General Section */}
      <div className="mb-8 bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-zinc-50 mb-4 flex items-center gap-2">
          <span>⚙️</span> General
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <label className="block text-sm font-medium text-zinc-50 mb-1">Tema</label>
              <p className="text-sm text-zinc-400">Selecciona tu tema preferido</p>
            </div>
            <select
              value={settings.theme}
              onChange={handleThemeChange}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-50 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="dark">Oscuro (Recomendado)</option>
              <option value="light">Claro</option>
              <option value="auto">Automático</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-zinc-50 mb-1">Actualización Automática</label>
              <p className="text-sm text-zinc-400">Actualiza el launcher automáticamente</p>
            </div>
            <button
              onClick={() => handleToggle('autoUpdate')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoUpdate ? 'bg-indigo-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoUpdate ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Java Settings Section */}
      <div className="mb-8 bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-zinc-50 mb-4 flex items-center gap-2">
          <span>☕</span> Java
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-50 mb-2">
              Memoria Mínima (GB)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="4"
                value={settings.javaMinMemory}
                onChange={(e) => handleMemoryChange('min', e.target.value)}
                className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="w-16 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-center text-zinc-50">
                {settings.javaMinMemory} GB
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Memoria mínima reservada para el juego</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-50 mb-2">
              Memoria Máxima (GB)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="2"
                max="16"
                value={settings.javaMaxMemory}
                onChange={(e) => handleMemoryChange('max', e.target.value)}
                className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="w-16 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-center text-zinc-50">
                {settings.javaMaxMemory} GB
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Memoria máxima que puede usar el juego</p>
          </div>

          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
            <p className="text-sm text-zinc-400 mb-2">
              <span className="font-medium text-zinc-50">Versión Java:</span> 17.0.2 (Bundled)
            </p>
            <p className="text-xs text-zinc-500">
              El launcher incluye Java 17 automáticamente. No necesitas instalar nada.
            </p>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-zinc-50 mb-4 flex items-center gap-2">
          <span>ℹ️</span> Acerca de
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
            <span className="text-sm text-zinc-400">Versión del Launcher</span>
            <span className="text-sm font-medium text-zinc-50">1.0.7</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
            <span className="text-sm text-zinc-400">Versión Minecraft</span>
            <span className="text-sm font-medium text-zinc-50">26.1 (Latest)</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
            <span className="text-sm text-zinc-400">Desarrollador</span>
            <span className="text-sm font-medium text-zinc-50">Mango Studios</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Sitio Web</span>
            <a href="#" className="text-sm font-medium text-indigo-500 hover:text-indigo-400 transition-colors">
              www.mangolauncher.dev
            </a>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 font-medium rounded-lg transition-colors">
            Abrir Carpeta de Datos
          </button>
          <button className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors">
            Buscar Actualizaciones
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsView