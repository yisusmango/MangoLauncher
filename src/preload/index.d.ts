import { ElectronAPI } from '@electron-toolkit/preload'

interface DownloadProgressData {
  percentage: number
  speed: string
  phase?: string
  isDownloading?: boolean
}

interface MinecraftInstance {
  id: string
  name: string
  version: string
  loader: string
  playtime: number
  icon: string
}

interface CreateInstanceData {
  name: string
  version: string
  loader?: string
  icon?: string
}

interface AppSettings {
  javaMinMemory: string
  javaMaxMemory: string
  theme: string
  autoUpdate: boolean
}

interface UserAccount {
  type: 'microsoft' | 'offline'
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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      launchInstance: (instance: MinecraftInstance) => void
      getInstances: () => Promise<MinecraftInstance[]>
      createInstance: (data: CreateInstanceData) => Promise<MinecraftInstance[]>
      getMinecraftVersions: () => Promise<string[]>
      deleteInstance: (id: string) => Promise<MinecraftInstance[]>
      onDownloadProgress: (callback: (data: DownloadProgressData) => void) => void
      getSettings: () => Promise<AppSettings>
      saveSettings: (settings: AppSettings) => Promise<boolean>
      loginMicrosoft: () => Promise<AuthData | null>
      loginOffline: (username: string) => Promise<AuthData>
      getAuthData: () => Promise<AuthData>
      switchAccount: (uuid: string) => Promise<AuthData>
      removeAccount: (uuid: string) => Promise<AuthData>
      
      // === Controladores del Updater ===
      onUpdateAvailable: (callback: (version: string) => void) => void
      startDownloadUpdate: () => void
      onUpdateReady: (callback: () => void) => void
      installUpdate: () => void

      // === Controlador de Logs de Minecraft ===
      onMinecraftLog: (callback: (log: string) => void) => void

      // === NUEVO: Controlador de Discord RPC ===
      updateDiscordStatus: (details: string, state: string) => void
    }
  }
}