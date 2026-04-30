import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

interface DownloadProgressData { percentage: number; speed: string; phase?: string; isDownloading?: boolean }
interface MinecraftInstance { id: string; name: string; version: string; loader: string; playtime: number; icon: string }
interface CreateInstanceData { name: string; version: string; loader?: string; icon?: string }
interface AppSettings { javaMinMemory: string; javaMaxMemory: string; theme: string; autoUpdate: boolean }
interface UserAccount { type: 'microsoft' | 'offline' | 'premium'; username: string; uuid: string; access_token?: string; client_token?: string; profile?: any }
interface AuthData { selectedId: string | null; accounts: UserAccount[] }
interface ScreenshotData { name: string; path: string; url: string; date: number }
interface CleanLogsResult { success: boolean; mbFreed: number; message: string }

const api = {
  launchInstance: (instance: MinecraftInstance): void => { ipcRenderer.send('launch-instance', instance) },
  getInstances: async (): Promise<MinecraftInstance[]> => { return await ipcRenderer.invoke('get-instances') },
  createInstance: async (data: CreateInstanceData): Promise<MinecraftInstance[]> => { return await ipcRenderer.invoke('create-instance', data) },
  getMinecraftVersions: async (): Promise<string[]> => { return await ipcRenderer.invoke('get-minecraft-versions') },
  deleteInstance: async (id: string): Promise<MinecraftInstance[]> => { return await ipcRenderer.invoke('delete-instance', id) },
  onDownloadProgress: (callback: (data: DownloadProgressData) => void): void => { ipcRenderer.on('download-progress', (_, data) => { callback(data) }) },
  getSettings: async (): Promise<AppSettings> => { return await ipcRenderer.invoke('get-settings') },
  saveSettings: async (settings: AppSettings): Promise<boolean> => { return await ipcRenderer.invoke('save-settings', settings) },
  loginMicrosoft: async (): Promise<AuthData | null> => { return await ipcRenderer.invoke('login-microsoft') },
  loginOffline: async (username: string): Promise<AuthData> => { return await ipcRenderer.invoke('login-offline', username) },
  getAuthData: async (): Promise<AuthData> => { return await ipcRenderer.invoke('get-auth-data') },
  switchAccount: async (uuid: string): Promise<AuthData> => { return await ipcRenderer.invoke('switch-account', uuid) },
  removeAccount: async (uuid: string): Promise<AuthData> => { return await ipcRenderer.invoke('remove-account', uuid) },
  onUpdateAvailable: (callback: (version: string) => void): void => { ipcRenderer.on('update-available', (_, version) => { callback(version) }) },
  startDownloadUpdate: (): void => { ipcRenderer.send('start-update-download') },
  onUpdateReady: (callback: () => void): void => { ipcRenderer.on('update-ready', () => { callback() }) },
  installUpdate: (): void => { ipcRenderer.send('install-update') },
  onMinecraftLog: (callback: (log: string) => void): void => { ipcRenderer.on('minecraft-log', (_, log) => { callback(log) }) },
  updateDiscordStatus: (details: string, state: string): void => { ipcRenderer.send('update-discord-rpc', { details, state }) },
  getScreenshots: async (instanceId: string): Promise<ScreenshotData[]> => { return await ipcRenderer.invoke('get-screenshots', instanceId) },
  deleteScreenshot: async (instanceId: string, fileName: string): Promise<boolean> => { return await ipcRenderer.invoke('delete-screenshot', instanceId, fileName) },
  openScreenshotFolder: (instanceId: string): void => { ipcRenderer.send('open-screenshots-folder', instanceId) },
  cleanInstanceLogs: async (instanceId: string): Promise<CleanLogsResult> => { return await ipcRenderer.invoke('clean-instance-logs', instanceId) },
  installMod: async (projectId: string, instanceId: string, mcVersion: string, loader: string) => { 
  return await ipcRenderer.invoke('install-mod', projectId, instanceId, mcVersion, loader) 
},
  searchMods: async (query: string) => { return await ipcRenderer.invoke('search-mods', query) },
  getInstalledMods: async (instanceId: string) => { return await ipcRenderer.invoke('get-installed-mods', instanceId) },
  toggleMod: async (instanceId: string, fileName: string) => { return await ipcRenderer.invoke('toggle-mod', instanceId, fileName) },
  deleteMod: async (instanceId: string, fileName: string) => { return await ipcRenderer.invoke('delete-mod', instanceId, fileName) },
  openModsFolder: (instanceId: string): void => { ipcRenderer.send('open-mods-folder', instanceId) },
  // === ESTA ES LA FUNCIÓN QUE FALTABA ===
  openDataFolder: (): void => { ipcRenderer.send('open-data-folder') },

  // === Controladores de la Ventana Secundaria ===
  openCreateInstanceWindow: (): void => {
    ipcRenderer.send('open-create-instance-window')
  },
  closeCreateInstanceWindow: (): void => {
    ipcRenderer.send('close-create-instance-window')
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
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}