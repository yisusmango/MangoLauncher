import { app, shell, BrowserWindow, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import path from 'path'
import { promises as fs } from 'fs'
import * as fsSync from 'fs' 
import { exec } from 'child_process'
import { promisify } from 'util'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { Client, Authenticator } from 'minecraft-launcher-core'
import * as msmc from 'msmc'
import { autoUpdater } from 'electron-updater'
import DiscordRPC from 'discord-rpc'

const execAsync = promisify(exec)

// --- REGISTRAR ESQUEMA PRIVILEGIADO PARA PROTOCOLO CUSTOM ---
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mango-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  }
])

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
      largeImageKey: 'mango_logo', 
      largeImageText: 'Mango Launcher v1.0.7',
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

// --- SISTEMA INTELIGENTE DE JAVA ---
async function getJavaMajorVersion(mcVersion: string): Promise<number> {
  const parts = mcVersion.split('.')
  const minor = parseInt(parts[1]) || 0
  const patch = parseInt(parts[2]) || 0
  
  if (minor <= 16) return 8 
  if (minor >= 21 || (minor === 20 && patch >= 5)) return 21 
  return 17 
}

async function ensureJava(mcVersion: string, event: Electron.IpcMainEvent): Promise<string | undefined> {
  const javaMajor = await getJavaMajorVersion(mcVersion)
  const javaDir = path.join(app.getPath('userData'), 'java', javaMajor.toString())
  const isWin = process.platform === 'win32'
  const javaExeName = isWin ? 'java.exe' : 'java'

  async function findJavaExe(dir: string): Promise<string | null> {
    if (!fsSync.existsSync(dir)) return null;
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const found = await findJavaExe(fullPath)
        if (found) return found
      } else if (entry.name === javaExeName && path.basename(path.dirname(fullPath)) === 'bin') {
        return fullPath
      }
    }
    return null
  }

  const existingJava = await findJavaExe(javaDir)
  if (existingJava) {
    console.log(`[Java Setup] Java ${javaMajor} ya está listo en: ${existingJava}`)
    return existingJava
  }

  event.sender.send('download-progress', {
    percentage: 0, speed: 'Iniciando...', phase: `Descargando Java ${javaMajor} (Requerido)...`, isDownloading: true
  })

  const os = isWin ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux'
  const arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'aarch64' : 'x86'
  const apiUrl = `https://api.adoptium.net/v3/binary/latest/${javaMajor}/ga/${os}/${arch}/jre/hotspot/normal/eclipse?project=jdk`
  
  try {
    console.log(`[Java Setup] Descargando desde: ${apiUrl}`)
    const res = await fetch(apiUrl, { redirect: 'follow' })
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`)
    
    await fs.mkdir(javaDir, { recursive: true })
    const extension = isWin ? '.zip' : '.tar.gz'
    const tempFile = path.join(javaDir, `java_download${extension}`)
    
    const totalBytes = Number(res.headers.get('content-length')) || 0
    let downloadedBytes = 0
    
    const body = Readable.fromWeb(res.body as any)
    const dest = fsSync.createWriteStream(tempFile)

    let lastUpdate = Date.now()
    
    body.on('data', (chunk) => {
      downloadedBytes += chunk.length
      const now = Date.now()
      if (now - lastUpdate > 500 && totalBytes > 0) {
        const percentage = Math.round((downloadedBytes / totalBytes) * 100)
        event.sender.send('download-progress', {
          percentage, speed: '', phase: `Descargando Java ${javaMajor}...`, isDownloading: true
        })
        lastUpdate = now
      }
    })

    body.pipe(dest)
    await finished(dest)

    event.sender.send('download-progress', {
      percentage: 100, speed: '', phase: `Instalando Java ${javaMajor}...`, isDownloading: true
    })
    console.log(`[Java Setup] Extrayendo archivo: ${tempFile}`)
    
    await execAsync(`tar -xf "${tempFile}" -C "${javaDir}"`)
    await fs.unlink(tempFile)

    const extractedJava = await findJavaExe(javaDir)
    if (!extractedJava) throw new Error("No se encontró java.exe tras la extracción")

    console.log(`[Java Setup] Java ${javaMajor} instalado correctamente.`)
    return extractedJava

  } catch (err) {
    console.error('[Java Setup] Falló la descarga de Java. Usando el del sistema por defecto.', err)
    return undefined 
  }
}

// ------------------------------------

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

// --- GESTOR DE CAPTURAS (SCREENSHOTS) ---
interface ScreenshotData {
  name: string
  path: string
  url: string
  date: number
}

async function getScreenshots(instanceId: string): Promise<ScreenshotData[]> {
  try {
    const screenshotsPath = path.join(app.getPath('userData'), 'instances', instanceId, 'screenshots')
    
    if (!fsSync.existsSync(screenshotsPath)) {
      return []
    }

    const files = await fs.readdir(screenshotsPath)
    const screenshots: ScreenshotData[] = []
    
    for (const file of files) {
      if (!file.endsWith('.png')) continue
      
      const filePath = path.join(screenshotsPath, file)
      const stat = await fs.stat(filePath)
      const fileUrl = 'mango-file:///' + filePath
      
      screenshots.push({
        name: file,
        path: filePath,
        url: fileUrl,
        date: stat.mtime.getTime()
      })
    }
    
    screenshots.sort((a, b) => b.date - a.date)
    return screenshots
  } catch (err) {
    console.error('[Screenshots] Error al leer capturas:', err)
    return []
  }
}

async function deleteScreenshot(instanceId: string, fileName: string): Promise<boolean> {
  try {
    const screenshotsPath = path.join(app.getPath('userData'), 'instances', instanceId, 'screenshots')
    const filePath = path.join(screenshotsPath, fileName)
    
    if (!filePath.startsWith(screenshotsPath)) {
      return false
    }
    
    if (!fsSync.existsSync(filePath)) {
      return false
    }
    
    await fs.unlink(filePath)
    return true
  } catch (err) {
    console.error('[Screenshots] Error al eliminar captura:', err)
    return false
  }
}

// --- NUEVO: REFERENCIA A LA VENTANA DE CREACIÓN ---
let createInstanceWin: BrowserWindow | null = null

function openCreateInstanceWindow(parentWindow: BrowserWindow): void {
  if (createInstanceWin) {
    createInstanceWin.focus()
    return
  }

  createInstanceWin = new BrowserWindow({
    width: 1100,
    height: 600,
    parent: parentWindow,
    modal: true, // Esto hace que no puedas tocar la ventana principal hasta cerrarla
    show: false,
    autoHideMenuBar: true,
    resizable: false, // Bloqueamos el tamaño para que el diseño quede perfecto
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  })

  createInstanceWin.on('ready-to-show', () => {
    createInstanceWin?.show()
  })

  createInstanceWin.on('closed', () => {
    createInstanceWin = null
  })

  // Usamos un Hash Routing para que React sepa que debe mostrar la nueva interfaz
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    createInstanceWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/create-instance`)
  } else {
    createInstanceWin.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'create-instance' })
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
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true
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

  protocol.handle('mango-file', (request) => {
    let filePath = decodeURIComponent(request.url.replace(/^mango-file:\/\/\/?/, ''));
    if (process.platform === 'win32') {
      filePath = filePath.replace(/^\/+/, '');
      if (/^[a-zA-Z]\//.test(filePath)) {
        filePath = filePath[0] + ':' + filePath.substring(1);
      }
    }
    const finalPath = path.normalize(filePath);
    return net.fetch('file:///' + finalPath);
  });

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  
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
    
    // Cerramos la ventana de creación al terminar (si está abierta)
    if (createInstanceWin) {
      createInstanceWin.close()
    }
    
    return instances
  })

  // --- NUEVOS LISTENERS PARA LA VENTANA DE CREACIÓN ---
  ipcMain.on('open-create-instance-window', (event) => {
    const parent = BrowserWindow.fromWebContents(event.sender)
    if (parent) {
      openCreateInstanceWindow(parent)
    }
  })

  ipcMain.on('close-create-instance-window', () => {
    if (createInstanceWin) {
      createInstanceWin.close()
    }
  })

  ipcMain.on('update-discord-rpc', (_, { details, state }) => {
    setDiscordActivity(details, state, false)
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

      if (instance.loader === 'Fabric') {
        event.sender.send('download-progress', {
          percentage: 0, speed: '', phase: 'Preparando entorno de Java y Fabric...', isDownloading: true
        });
      }

      const [customJavaPath, fabricVersion] = await Promise.all([
        ensureJava(instance.version, event),
        instance.loader === 'Fabric' 
          ? setupFabric(instancePath, instance.version) 
          : Promise.resolve(undefined)
      ]);

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

      const opts: any = {
        authorization: auth as any, 
        root: instancePath,
        version: {
          number: instance.version,
          type: 'release'
        },
        memory: {
          max: `${currentSettings.javaMaxMemory}G`, 
          min: `${currentSettings.javaMinMemory}G`  
        },
        javaPath: customJavaPath 
      }

      if (fabricVersion) {
        opts.version.custom = fabricVersion
      }

      launcher.on('debug', (msg: string) => {
        console.log(`[MCLC] ${msg}`) 
        event.sender.send('minecraft-log', `[LAUNCHER] ${msg}`)
      })

      let hasStarted = false;
      let sessionStartTime = 0; 

      launcher.on('data', (msg: string) => {
        if (!hasStarted) {
          hasStarted = true;
          sessionStartTime = Date.now(); 
          event.sender.send('download-progress', {
            percentage: 100, speed: '', phase: '¡Listo!', isDownloading: false
          });
        }
        console.log(`[MINECRAFT] ${msg}`) 
        event.sender.send('minecraft-log', msg)
      })

      launcher.on('close', async (code: number) => {
        if (sessionStartTime > 0) {
          const sessionTimeSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
          try {
            const instances = await getInstancesFromFile();
            const targetInstance = instances.find(i => i.id === instance.id);
            
            if (targetInstance) {
              targetInstance.playtime = (targetInstance.playtime || 0) + sessionTimeSeconds;
              await saveInstancesToFile(instances);
              console.log(`[Playtime] Sesión de ${instance.name}: ${sessionTimeSeconds}s guardados. Total: ${targetInstance.playtime}s`);
            }
          } catch (err) {
            console.error('[Playtime] Error guardando tiempo de juego:', err);
          }
        }

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

      console.log(`[Main Process] Iniciando motor de descarga (MCLC)...`)
      
      setDiscordActivity(`Jugando: ${instance.name}`, `Versión: ${instance.version} [${instance.loader}]`, true)
      
      await launcher.launch(opts)

    } catch (error) {
      console.error(`[Main Process] Error FATAL al lanzar instancia: ${instance.name}`, error)
      event.sender.send('minecraft-log', `[ERROR] Falló al lanzar: ${error}`)
      
      event.sender.send('download-progress', {
          percentage: 0, speed: '', phase: 'Error al iniciar', isDownloading: false
      });
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

  ipcMain.handle('clean-instance-logs', async (_, instanceId: string) => {
    try {
      const logsPath = path.join(app.getPath('userData'), 'instances', instanceId, 'logs')
      
      if (!fsSync.existsSync(logsPath)) {
        return { success: true, mbFreed: 0, message: "No hay logs para limpiar." }
      }

      const files = await fs.readdir(logsPath)
      let bytesFreed = 0
      let filesDeleted = 0

      for (const file of files) {
        if (file.endsWith('.log.gz') || file.endsWith('.log')) {
          const filePath = path.join(logsPath, file)
          const stat = await fs.stat(filePath)
          
          await fs.unlink(filePath)
          bytesFreed += stat.size
          filesDeleted++
        }
      }

      const mbFreed = (bytesFreed / (1024 * 1024)).toFixed(2)
      console.log(`[Log Cleaner] Instancia ${instanceId}: ${filesDeleted} archivos borrados (${mbFreed} MB liberados)`)
      
      return { 
        success: true, 
        mbFreed: parseFloat(mbFreed), 
        message: `Se liberaron ${mbFreed} MB (${filesDeleted} archivos borrados)` 
      }
    } catch (error) {
      console.error(`[Log Cleaner] Error al limpiar logs de ${instanceId}:`, error)
      return { success: false, mbFreed: 0, message: "Error al limpiar los logs." }
    }
  })

  ipcMain.handle('get-screenshots', async (_, instanceId: string) => {
    return await getScreenshots(instanceId)
  })

  ipcMain.handle('delete-screenshot', async (_, instanceId: string, fileName: string) => {
    return await deleteScreenshot(instanceId, fileName)
  })

  ipcMain.on('open-screenshots-folder', (_, instanceId: string) => {
  const screenshotsPath = path.join(app.getPath('userData'), 'instances', instanceId, 'screenshots')
  
  if (!fsSync.existsSync(screenshotsPath)) {
    fsSync.mkdirSync(screenshotsPath, { recursive: true })
  }
  
  shell.openPath(screenshotsPath).catch(err => {
    console.error('[Screenshots] Error al abrir carpeta:', err)
  })
})

// REEMPLÁZALO POR ESTE OTRO:
ipcMain.on('open-screenshots-folder', (_, instanceId: string) => {
  let targetPath: string;

  // Si el ID es 'root' o 'root_folder', abrimos la raíz del launcher
  if (instanceId === 'root' || instanceId === 'root_folder') {
    targetPath = app.getPath('userData'); // Esto es AppData\Roaming\mangolauncher
  } else {
    // Si es una instancia normal, abrimos sus capturas
    targetPath = path.join(app.getPath('userData'), 'instances', instanceId, 'screenshots');
  }
  
  // Crear la carpeta si no existe (por si las moscas)
  if (!fsSync.existsSync(targetPath)) {
    fsSync.mkdirSync(targetPath, { recursive: true });
  }
  
  shell.openPath(targetPath).catch(err => {
    console.error('[Explorer] Error al abrir carpeta:', err);
  });
})

  // --- LISTENER PARA ABRIR LA CARPETA RAÍZ DE DATOS DEL LAUNCHER ---
  ipcMain.on('open-data-folder', () => {
    shell.openPath(app.getPath('userData')).catch(err => console.error(err));
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