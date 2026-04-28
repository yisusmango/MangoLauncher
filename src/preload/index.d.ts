import { ElectronAPI } from '@electron-toolkit/preload'

interface DownloadProgressData {
  percentage: number
  speed: string
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
    }
  }
}
