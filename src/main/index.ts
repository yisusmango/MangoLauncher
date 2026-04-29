import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import path from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { Client, Authenticator } from 'minecraft-launcher-core'
import * as msmc from 'msmc'
import { autoUpdater } from 'electron-updater'
import DiscordRPC from 'discord-rpc' // <-- NUEVO: Importamos Discord RPC

// --- CONFIGURACIÓN DE ACTUALIZACIONES ---
autoUpdater.autoDownload = false

function checkUpdates(mainWindow: BrowserWindow): void {
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info.version)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('download-progress', {
      percentage: Math.round(progressObj.percent),
      speed: `${(progressObj.bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`,
      phase: 'Actualizando Mango Launcher...',
      isDownloading: true
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-ready')
  })

  autoUpdater.on('error', (err) => {
    console.error('Error en el auto-updater:', err)
  })
}

// --- CONFIGURACIÓN DE DISCORD RPC ---
// Reemplaza los números por el Application ID de tu bot en el Discord Developer Portal
const clientId = '1498877731927101450' 
DiscordRPC.register(clientId)

const rpc = new DiscordRPC.Client({ transport: 'ipc' })
let rpcStartTimestamp = new Date()

async function setDiscordActivity(details: string, state: string, resetTime: boolean = false) {
  if (!rpc) return;
  if (resetTime) rpcStartTimestamp = new Date();
  
  try {
    await rpc.setActivity({
      details: details,
      state: state,
      startTimestamp: rpcStartTimestamp,
      largeImageKey: 'mango_logo', // <-- Sube tu icono a Discord con este nombre exacto
      largeImageText: 'Mango Launcher v1.0.6',
      instance: false,
    })
  } catch (err) {
    console.error('[Discord RPC] Error al actualizar estado:', err)
  }
}

rpc.on('ready', () => {
  console.log('[Discord RPC] Conectado exitosamente')
  setDiscordActivity('Navegando en el Launcher', 'Menú Principal', true)
})
// ------------------------------------

interface DownloadTracker {
  lastBytesDownloaded: number
  lastTimestamp: number
}

interface MinecraftInstance {
  id: string
  name: string
  version: string
  loader: string
  playtime: number
  icon: string
}

interface MinecraftVersion {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
  url: string
  time: string
  releaseTime: string
}

interface VersionManifest {
  versions: MinecraftVersion[]
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

const instancesFile = path.join(app.getPath('userData'), 'instances.json')
const settingsFile = path.join(app.getPath('userData'), 'settings.json') 
const authFile = path.join(app.getPath('userData'), 'auth.json')

const sanitizeFolderName = (name: string) => {
  return name.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, ''); 
}

const defaultSettings: AppSettings = {
  javaMinMemory: '2',
  javaMaxMemory: '4',
  theme: 'dark',
  autoUpdate: true
}

async function getAuthData(): Promise<AuthData> {
  try {
    const data = await fs.readFile(authFile, 'utf-8')
    const parsed = JSON.parse(data)
    if (parsed.username && !parsed.accounts) {
      const migrated: AuthData = { selectedId: parsed.uuid, accounts: [parsed] }
      await saveAuthData(migrated)
      return migrated
    }
    return parsed
  } catch {
    return { selectedId: null, accounts: [] }
  }
}

async function saveAuthData(data: AuthData): Promise<void> {
  try {
    await fs.mkdir(path.dirname(authFile), { recursive: true })
    await fs.writeFile(authFile, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error("Error guardando auth.json:", error)
  }
}

async function getActiveAccount(): Promise<UserAccount | null> {
  const data = await getAuthData()
  return data.accounts.find(a => a.uuid === data.selectedId) || null
}

async function getSettings(): Promise<AppSettings> {
  try {
    const data = await fs.readFile(settingsFile, 'utf-8')
    return { ...defaultSettings, ...JSON.parse(data) }
  } catch {
    return defaultSettings
  }
}

async function saveSettings(settings: AppSettings): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(settingsFile), { recursive: true })
    await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2))
    return true
  } catch (error) {
    console.error("Error guardando settings:", error)
    return false
  }
}

async function getInstancesFromFile(): Promise<MinecraftInstance[]> {
  try {
    const data = await fs.readFile(instancesFile, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveInstancesToFile(instances: MinecraftInstance[]): Promise<void> {
  const dir = path.dirname(instancesFile)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(instancesFile, JSON.stringify(instances, null, 2))
}

async function fetchMinecraftVersions(): Promise<string[]> {
  try {
    const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json')
    const manifest: VersionManifest = await response.json()
    const releaseVersions = manifest.versions
      .filter((version) => version.type === 'release')
      .map((version) => version.id)
    return releaseVersions
  } catch (error) {
    console.error('[Main Process] Error fetching Minecraft versions:', error)
    return []
  }
}

async function setupFabric(instancePath: string, mcVersion: string): Promise<string | null> {
  const modsPath = path.join(instancePath, 'mods')
  await fs.mkdir(modsPath, { recursive: true }) 

  try {
    console.log(`[Fabric Setup] Buscando loader para la versión ${mcVersion}...`)
    
    const loaderRes = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`)
    const loaders = await loaderRes.json()
    if (!loaders || loaders.length === 0) throw new Error('No hay loader de Fabric para esta versión')

    const latestLoader = loaders[0].loader.version
    const customVersionName = `fabric-${mcVersion}-${latestLoader}`

    const versionDir = path.join(instancePath, 'versions', customVersionName)
    await fs.mkdir(versionDir, { recursive: true })
    const jsonPath = path.join(versionDir, `${customVersionName}.json`)

    const profileRes = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${latestLoader}/profile/json`)
    const profileJson = await profileRes.json()

    await fs.writeFile(jsonPath, JSON.stringify(profileJson, null, 2))
    console.log(`[Fabric Setup] Configurado correctamente: ${customVersionName}`)

    return customVersionName
  } catch (err) {
    console.error('[Fabric Setup] Error al configurar Fabric:', err)
    return null
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    checkUpdates(mainWindow) 
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  
  // <-- NUEVO: Inicializar conexión con Discord
  rpc.login({ clientId }).catch(console.error)

  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('get-settings', async () => await getSettings())
  ipcMain.handle('save-settings', async (_, settings) => await saveSettings(settings))
  ipcMain.handle('get-auth-data', async () => await getAuthData())
  
  ipcMain.on('start-update-download', () => {
    autoUpdater.downloadUpdate()
  })

  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('login-offline', async (_, username: string) => {
    const data = await getAuthData()
    const uuid = 'offline-' + Date.now() 
    const account: UserAccount = {
      type: 'offline',
      username: username || 'DevPlayer',
      uuid: uuid,
    }
    data.accounts.push(account)
    data.selectedId = uuid
    await saveAuthData(data)
    return data
  })

  ipcMain.handle('login-microsoft', async () => {
    try {
      const authManager = new msmc.Auth("select_account");
      const xboxManager = await authManager.launch("raw");
      const token = await xboxManager.getMinecraft();
      const mclcToken = token.mclc(); 

      const account: UserAccount = {
        type: 'microsoft',
        username: mclcToken.name || 'PremiumPlayer', 
        uuid: mclcToken.uuid || 'unknown-uuid',      
        access_token: mclcToken.access_token,
        client_token: mclcToken.client_token || 'client_token',
        profile: mclcToken
      }
      
      const data = await getAuthData()
      const existingIndex = data.accounts.findIndex(a => a.uuid === account.uuid)
      
      if (existingIndex >= 0) {
        data.accounts[existingIndex] = account 
      } else {
        data.accounts.push(account) 
      }
      data.selectedId = account.uuid
      
      await saveAuthData(data)
      return data
    } catch (err) {
      console.error("Error en login Microsoft:", err)
      return null
    }
  })

  ipcMain.handle('switch-account', async (_, uuid: string) => {
    const data = await getAuthData()
    if (data.accounts.some(a => a.uuid === uuid)) {
      data.selectedId = uuid
      await saveAuthData(data)
    }
    return data
  })

  ipcMain.handle('remove-account', async (_, uuid: string) => {
    const data = await getAuthData()
    data.accounts = data.accounts.filter(a => a.uuid !== uuid)
    if (data.selectedId === uuid) {
      data.selectedId = data.accounts.length > 0 ? data.accounts[0].uuid : null
    }
    await saveAuthData(data)
    return data
  })

  ipcMain.handle('get-instances', async () => {
    return await getInstancesFromFile()
  })

  ipcMain.handle('create-instance', async (_, data) => {
    const instances = await getInstancesFromFile()
    
    const baseFolderName = sanitizeFolderName(data.name) || 'instancia'
    
    let uniqueId = baseFolderName
    let counter = 2
    
    while (instances.some(instance => instance.id === uniqueId)) {
      uniqueId = `${baseFolderName}_${counter}`
      counter++
    }

    const newInstance: MinecraftInstance = {
      id: uniqueId, 
      name: data.name,
      version: data.version,
      loader: data.loader || 'Vanilla',
      playtime: 0,
      icon: data.icon || '📦'
    }
    instances.push(newInstance)
    await saveInstancesToFile(instances)
    return instances
  })

  ipcMain.on('launch-instance', async (event, instance: MinecraftInstance) => {
    console.log(`[Main Process] Preparando lanzamiento de la instancia: ${instance.name}`)

    try {
      const launcher = new Client()
      const currentSettings = await getSettings() 
      const account = await getActiveAccount() 

      const downloadTracker: DownloadTracker = {
        lastBytesDownloaded: 0,
        lastTimestamp: Date.now()
      }

      const instancePath = path.join(app.getPath('userData'), 'instances', instance.id)
      await fs.mkdir(instancePath, { recursive: true })

      let customVersionName: string | undefined = undefined;
      if (instance.loader === 'Fabric') {
        event.sender.send('download-progress', {
          percentage: 0, speed: '', phase: 'Configurando motor Fabric...', isDownloading: true
        });
        const result = await setupFabric(instancePath, instance.version);
        if (result) customVersionName = result;
      }

      let auth;
      if (account && account.type === 'microsoft') {
        auth = {
          access_token: account.access_token,
          client_token: account.client_token,
          uuid: account.uuid,
          name: account.username,
          user_properties: '{}'
        }
      } else {
        const offlineName = account?.username || 'DevPlayer'
        auth = Authenticator.getAuth(offlineName)
      }

      const opts = {
        authorization: auth as any, 
        root: instancePath,
        version: {
          number: instance.version,
          type: 'release',
          custom: customVersionName 
        },
        memory: {
          max: `${currentSettings.javaMaxMemory}G`, 
          min: `${currentSettings.javaMinMemory}G`  
        }
      }

      launcher.on('debug', (msg: string) => {
        event.sender.send('minecraft-log', `[LAUNCHER] ${msg}`)
      })

      let hasStarted = false;
      
      launcher.on('data', (msg: string) => {
        if (!hasStarted) {
          hasStarted = true;
          event.sender.send('download-progress', {
            percentage: 100, speed: '', phase: '¡Listo!', isDownloading: false
          });
        }
        event.sender.send('minecraft-log', msg)
      })

      // <-- NUEVO: Al cerrar el juego, Discord vuelve a modo inactivo
      launcher.on('close', (code: number) => {
        event.sender.send('minecraft-log', `[SISTEMA] El juego se cerró con el código: ${code}`)
        setDiscordActivity('Navegando en el Launcher', 'Menú Principal', true)
      })

      let currentPhase = '';
      launcher.on('download-status', (status: Record<string, unknown>) => {
        try {
          const type = (status.type as string) || 'archivos';
          const current = (status.current as number) || 0;
          const total = (status.total as number) || 0;

          if (currentPhase !== type) {
            currentPhase = type;
            downloadTracker.lastBytesDownloaded = current;
            downloadTracker.lastTimestamp = Date.now();
          }

          if (type === 'assets') {
            downloadTracker.lastBytesDownloaded = current;
            downloadTracker.lastTimestamp = Date.now();
            
            event.sender.send('download-progress', {
              percentage: 99, speed: '...   ', phase: 'Descargando sonidos y texturas...', isDownloading: true
            });
            return; 
          }

          if (total > 0) {
            const percentage = Math.round((current / total) * 100)
            const currentTimestamp = Date.now()
            const timeDelta = Math.max(currentTimestamp - downloadTracker.lastTimestamp, 1)
            const bytesDelta = Math.max(current - downloadTracker.lastBytesDownloaded, 0)

            if (timeDelta >= 500) {
              const speedMBps = (bytesDelta / timeDelta) * 1000 / (1024 * 1024)
              
              downloadTracker.lastBytesDownloaded = current
              downloadTracker.lastTimestamp = currentTimestamp

              const phaseNames: Record<string, string> = {
                'classes': 'Librerías', 'jar': 'Cliente', 'natives': 'Nativos'
              };
              const phaseName = phaseNames[type] || type;

              event.sender.send('download-progress', {
                percentage: percentage, speed: `${speedMBps.toFixed(2)} MB/s`, phase: `Descargando ${phaseName.toLowerCase()}...`, isDownloading: true
              })
            }
          }
        } catch (err) {
          console.error("Error calculando progreso visual:", err)
        }
      })

      console.log(`[Main Process] Iniciando lanzamiento con opciones:`, opts)
      
      // <-- NUEVO: Al iniciar, Discord muestra la versión y el modloader
      setDiscordActivity(`Jugando: ${instance.name}`, `Versión: ${instance.version} [${instance.loader}]`, true)
      
      launcher.launch(opts)
    } catch (error) {
      console.error(`[Main Process] Error al lanzar instancia: ${instance.name}`, error)
      event.sender.send('minecraft-log', `[ERROR] Falló al lanzar: ${error}`)
    }
  })

  ipcMain.handle('get-minecraft-versions', async () => {
    const versions = await fetchMinecraftVersions()
    return versions
  })

  ipcMain.handle('delete-instance', async (_, id: string) => {
    try {
      const instances = await getInstancesFromFile()
      const filteredInstances = instances.filter((instance) => instance.id !== id)
      await saveInstancesToFile(filteredInstances)

      const instanceFolder = path.join(app.getPath('userData'), 'instances', id)
      await fs.rm(instanceFolder, { recursive: true, force: true })

      console.log(`[Main Process] Instancia ${id} eliminada exitosamente`)
      return filteredInstances
    } catch (error) {
      console.error(`[Main Process] Error al eliminar instancia: ${id}`, error)
      return await getInstancesFromFile()
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})