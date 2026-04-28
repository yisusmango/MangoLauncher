import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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

interface AppSettings {
  javaMinMemory: string
  javaMaxMemory: string
  theme: string
  autoUpdate: boolean
}

// Custom APIs for renderer
const api = {
  launchInstance: (instance: MinecraftInstance): void => {
    ipcRenderer.send('launch-instance', instance)
  },
  getInstances: async (): Promise<MinecraftInstance[]> => {
    return await ipcRenderer.invoke('get-instances')
  },
  createInstance: async (data: CreateInstanceData): Promise<MinecraftInstance[]> => {
    return await ipcRenderer.invoke('create-instance', data)
  },
  getMinecraftVersions: async (): Promise<string[]> => {
    return await ipcRenderer.invoke('get-minecraft-versions')
  },
  deleteInstance: async (id: string): Promise<MinecraftInstance[]> => {
    return await ipcRenderer.invoke('delete-instance', id)
  },
  onDownloadProgress: (callback: (data: DownloadProgressData) => void): void => {
    ipcRenderer.on('download-progress', (_, data: DownloadProgressData) => {
      callback(data)
    })
  },
  // NUEVO: Funciones para manejar los ajustes
  getSettings: async (): Promise<AppSettings> => {
    return await ipcRenderer.invoke('get-settings')
  },
  saveSettings: async (settings: AppSettings): Promise<boolean> => {
    return await ipcRenderer.invoke('save-settings', settings)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}