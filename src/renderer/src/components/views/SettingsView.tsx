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

  useEffect(() => {
    const loadSettings = async () => {
      // @ts-ignore
      const savedSettings = await window.api.getSettings()
      if (savedSettings) setSettings(savedSettings)
    }
    loadSettings()
  }, [])

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

      {/* Sección General */}
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

      {/* Sección Java (Sin cuadro informativo) */}
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
          </div>
        </div>
      </div>

      {/* Operaciones de Sistema */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-zinc-50 mb-6 flex items-center gap-2">
          <span>🛠️</span> Operaciones de Sistema
        </h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => window.api.openDataFolder()} 
            className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-50 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>📁</span> Abrir Carpeta de Datos
          </button>
          <button 
            onClick={() => window.api.startDownloadUpdate()}
            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>🔄</span> Buscar Actualizaciones
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsView