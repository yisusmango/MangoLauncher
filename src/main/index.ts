import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import path from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { Client, Authenticator } from 'minecraft-launcher-core'
import * as msmc from 'msmc'
import { autoUpdater } from 'electron-updater'

// --- CONFIGURACIÓN DE ACTUALIZACIONES ---
autoUpdater.autoDownload = false // No descargar automáticamente, preguntar primero

function checkUpdates(mainWindow: BrowserWindow): void {
  // Iniciar búsqueda
  autoUpdater.checkForUpdatesAndNotify()

  // Cuando hay una actualización disponible
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Actualización disponible',
      message: 'Hay una nueva versión de Mango Launcher disponible. ¿Deseas descargarla ahora?',
      buttons: ['Sí', 'Más tarde'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })

  // Cuando la descarga termina
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Actualización lista',
      message: 'La nueva versión ha sido descargada. Se instalará automáticamente al cerrar la aplicación.',
      buttons: ['Entendido']
    })
  })

  // Manejo de errores (opcional pero recomendado)
  autoUpdater.on('error', (err) => {
    console.error('Error en el auto-updater:', err)
  })
}

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

// === INTERFACES MULTI-CUENTA ===
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
const authFile = path.join(app.getPath('userData'), 'auth.json') // <-- ARCHIVO DE SESIONES

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

// === GESTOR DE AUTENTICACIÓN MULTI-CUENTA ===
async function getAuthData(): Promise<AuthData> {
  try {
    const data = await fs.readFile(authFile, 'utf-8')
    const parsed = JSON.parse(data)
    
    // Migración automática: Si el archivo tiene formato viejo de 1 sola cuenta, lo convierte a Multi-Cuenta
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

// === GESTOR DE FABRIC ===
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
    checkUpdates(mainWindow) // Verificar actualizaciones al mostrar la ventana
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

  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('get-settings', async () => await getSettings())
  ipcMain.handle('save-settings', async (_, settings) => await saveSettings(settings))

  // === NUEVOS ENDPOINTS DE AUTENTICACIÓN MULTI-CUENTA ===
  ipcMain.handle('get-auth-data', async () => await getAuthData())
  
  ipcMain.handle('login-offline', async (_, username: string) => {
    const data = await getAuthData()
    const uuid = 'offline-' + Date.now() // Permite múltiples cuentas offline únicas
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
        data.accounts[existingIndex] = account // Actualiza token si la cuenta ya existía
      } else {
        data.accounts.push(account) // Añade nueva cuenta
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
    // Si borramos la cuenta activa, seleccionamos otra (o null si no quedan)
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
      const account = await getActiveAccount() // <-- LEEMOS LA CUENTA ACTIVA DE LA LISTA

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

      // LÓGICA DE INYECCIÓN DE SESIÓN
      let auth;
      if (account && account.type === 'microsoft') {
        console.log(`[Main] Autenticando vía Microsoft API para el usuario: ${account.username}`)
        auth = {
          access_token: account.access_token,
          client_token: account.client_token,
          uuid: account.uuid,
          name: account.username,
          user_properties: '{}'
        }
      } else {
        const offlineName = account?.username || 'DevPlayer'
        console.log(`[Main] Autenticando en Modo Offline como: ${offlineName}`)
        auth = Authenticator.getAuth(offlineName)
      }

      const opts = {
        authorization: auth as any, // <-- AQUÍ PASAMOS LA SESIÓN SEGURA
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

      launcher.on('debug', (_msg: string) => {})

      let hasStarted = false;
      launcher.on('data', (_msg: string) => {
        if (!hasStarted) {
          hasStarted = true;
          event.sender.send('download-progress', {
            percentage: 100, speed: '', phase: '¡Listo!', isDownloading: false
          });
        }
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
      launcher.launch(opts)
    } catch (error) {
      console.error(`[Main Process] Error al lanzar instancia: ${instance.name}`, error)
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