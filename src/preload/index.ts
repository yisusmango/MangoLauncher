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

// Interfaz para la cuenta de usuario
interface UserAccount {
  type: 'microsoft' | 'offline'
  username: string
  uuid: string
  access_token?: string
  client_token?: string
  profile?: any
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
  getSettings: async (): Promise<AppSettings> => {
    return await ipcRenderer.invoke('get-settings')
  },
  saveSettings: async (settings: AppSettings): Promise<boolean> => {
    return await ipcRenderer.invoke('save-settings', settings)
  },
  // NUEVO: Funciones para manejar la autenticación
  loginMicrosoft: async (): Promise<UserAccount | null> => {
    return await ipcRenderer.invoke('login-microsoft')
  },
  loginOffline: async (username: string): Promise<UserAccount> => {
    return await ipcRenderer.invoke('login-offline', username)
  },
  logout: async (): Promise<boolean> => {
    return await ipcRenderer.invoke('logout')
  },
  getAccount: async (): Promise<UserAccount | null> => {
    return await ipcRenderer.invoke('get-account')
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