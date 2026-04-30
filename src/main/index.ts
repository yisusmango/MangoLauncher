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
// Importa el archivo package.json para obtener la versión dinámica
import packageInfo from '../../package.json'

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
      // CAMBIO AQUÍ: Usamos la versión del package.json
      largeImageText: `Mango Launcher v${packageInfo.version}`,
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
  loaderVersion?: string
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

interface ModrinthSearchResult {
  hits: Array<{
    project_id: string;
    title: string;
    description: string;
    icon_url: string;
    downloads: number;
    author: string;
  }>;
}

interface VersionManifest {
  versions: MinecraftVersion[]
}

interface AppSettings {
  javaMinMemory: string
  javaMaxMemory: string
  theme: string
  autoUpdate: boolean
  windowWidth?: number
  windowHeight?: number
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
  autoUpdate: true,
  windowWidth: 900,  // Ancho por defecto
  windowHeight: 670  // Alto por defecto
}

// --- SISTEMA INTELIGENTE DE JAVA ---
async function getJavaMajorVersion(mcVersion: string): Promise<number> {
  const parts = mcVersion.split('.').map((part) => parseInt(part, 10) || 0)
  let major = parts[0]
  let minor = parts[1] || 0

  if (major === 1) {
    major = minor
    minor = parts[2] || 0
  }

  if (major <= 16) return 8
  if (major >= 17 && major <= 19) return 17
  if (major === 20) return 20
  if (major >= 21 && major <= 25) return major
  if (major >= 26) return 25
  return 17
}

function parseJavaMajorVersion(output: string): number | null {
  const match = output.match(/version "(\d+)(?:\.(\d+))?(?:\.(\d+))?/) || output.match(/version "1\.(\d+)/)
  if (!match) return null

  const first = parseInt(match[1], 10)
  if (first === 1 && match[2]) {
    return parseInt(match[2], 10)
  }
  return first
}

async function getJavaMajorFromBinary(javaPath: string): Promise<number | null> {
  try {
    const { stderr } = await execAsync(`"${javaPath}" -version`)
    const major = parseJavaMajorVersion(stderr)
    return major
  } catch (error) {
    return null
  }
}

async function findJavaExe(dir: string): Promise<string | null> {
  if (!fsSync.existsSync(dir)) return null
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const found = await findJavaExe(fullPath)
      if (found) return found
    } else if (entry.name === 'java.exe' || entry.name === 'java') {
      if (path.basename(path.dirname(fullPath)) === 'bin') {
        return fullPath
      }
    }
  }
  return null
}

async function findCompatibleJava(requestedMajor: number): Promise<string | undefined> {
  const javaRoot = path.join(app.getPath('userData'), 'java')
  if (!fsSync.existsSync(javaRoot)) return undefined

  let bestMatch: { path: string; major: number } | undefined
  const entries = await fs.readdir(javaRoot, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const candidateRoot = path.join(javaRoot, entry.name)
    const candidate = await findJavaExe(candidateRoot)
    if (!candidate) continue

    const major = await getJavaMajorFromBinary(candidate)
    if (major === null) continue

    if (major === requestedMajor) {
      return candidate
    }

    if (major > requestedMajor) {
      const isModernCompatible = requestedMajor >= 17
      if (isModernCompatible) {
        if (!bestMatch || major < bestMatch.major) {
          bestMatch = { path: candidate, major }
        }
      }
    }
  }

  return bestMatch?.path
}

interface AssetDownloadMetadata {
  hashToAssetPath: Record<string, string>
  hashToSize: Record<string, number>
  missingBytes: number
  totalBytes: number
  totalAssets: number
  missingAssets: number
}

async function buildAssetDownloadMetadata(instancePath: string, versionNumber: string, customVersion?: string): Promise<AssetDownloadMetadata | null> {
  try {
    const versionFolder = customVersion || versionNumber
    const versionJsonPath = path.join(instancePath, 'versions', versionFolder, `${versionFolder}.json`)
    if (!fsSync.existsSync(versionJsonPath)) return null

    const versionJsonRaw = await fs.readFile(versionJsonPath, 'utf8')
    const versionJson = JSON.parse(versionJsonRaw) as any
    const assetIndex = versionJson.assetIndex
    if (!assetIndex || !assetIndex.id) return null

    const assetIndexId = assetIndex.id as string
    const assetIndexUrl = assetIndex.url as string | undefined
    const assetIndexesDir = path.join(instancePath, 'assets', 'indexes')
    const assetIndexPath = path.join(assetIndexesDir, `${assetIndexId}.json`)

    if (!fsSync.existsSync(assetIndexPath)) {
      if (!assetIndexUrl) return null
      await fs.mkdir(assetIndexesDir, { recursive: true })
      const response = await fetch(assetIndexUrl)
      if (!response.ok) {
        console.warn(`[Asset Metadata] No se pudo descargar el asset index ${assetIndexId}: ${response.status}`)
        return null
      }
      const body = await response.text()
      await fs.writeFile(assetIndexPath, body, 'utf8')
    }

    const assetIndexRaw = await fs.readFile(assetIndexPath, 'utf8')
    const assetIndexJson = JSON.parse(assetIndexRaw) as { objects?: Record<string, { hash: string; size: number }> }
    const objects = assetIndexJson.objects || {}
    const assetRoot = path.join(instancePath, 'assets', 'objects')

    const hashToAssetPath: Record<string, string> = {}
    const hashToSize: Record<string, number> = {}
    let totalBytes = 0
    let missingBytes = 0
    let totalAssets = 0
    let missingAssets = 0

    for (const assetPath in objects) {
      const object = objects[assetPath]
      const hash = object.hash
      const size = Number(object.size) || 0
      hashToAssetPath[hash] = assetPath
      hashToSize[hash] = size
      totalBytes += size
      totalAssets += 1

      const subhash = hash.slice(0, 2)
      const objectFile = path.join(assetRoot, subhash, hash)
      if (!fsSync.existsSync(objectFile)) {
        missingAssets += 1
        missingBytes += size
      } else {
        try {
          const stats = fsSync.statSync(objectFile)
          if (stats.size !== size) {
            missingAssets += 1
            missingBytes += size
          }
        } catch {
          missingAssets += 1
          missingBytes += size
        }
      }
    }

    return {
      hashToAssetPath,
      hashToSize,
      missingBytes,
      totalBytes,
      totalAssets,
      missingAssets
    }
  } catch (error) {
    console.warn('[Asset Metadata] Error construyendo metadata de assets:', error)
    return null
  }
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
    const existingMajor = await getJavaMajorFromBinary(existingJava)
    if (existingMajor && (existingMajor === javaMajor || (javaMajor >= 17 && existingMajor > javaMajor))) {
      console.log(`[Java Setup] Java compatible ya está listo en: ${existingJava} (detectado v${existingMajor})`)
      return existingJava
    }

    console.warn(`[Java Setup] Java encontrado en ${existingJava} no es compatible con ${javaMajor} (detected v${existingMajor}). Buscando otra versión compatible...`)
  }

  const fallbackJava = await findCompatibleJava(javaMajor)
  if (fallbackJava) {
    const fallbackMajor = await getJavaMajorFromBinary(fallbackJava)
    console.log(`[Java Setup] Usando Java ya instalado compatible en: ${fallbackJava} (v${fallbackMajor})`)
    return fallbackJava
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
    await extractArchive(tempFile, javaDir, isWin)
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

async function setupFabric(instancePath: string, mcVersion: string, requestedLoaderVersion?: string): Promise<string | null> {
  const modsPath = path.join(instancePath, 'mods')
  await fs.mkdir(modsPath, { recursive: true })

  try {
    console.log(`[Fabric Setup] Buscando loader para la versión ${mcVersion}...`)

    const loaderRes = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`)
    if (!loaderRes.ok) {
      throw new Error(`Error al consultar loaders de Fabric: ${loaderRes.status}`)
    }

    const loaders: any[] = await loaderRes.json()
    if (!Array.isArray(loaders) || loaders.length === 0) throw new Error('No hay loader de Fabric para esta versión')

    let selectedLoaderVersion = loaders[0].loader.version
    if (requestedLoaderVersion) {
      const matched = loaders.find((entry) => entry.loader?.version === requestedLoaderVersion)
      if (matched) {
        selectedLoaderVersion = requestedLoaderVersion
      } else {
        console.warn(`[Fabric Setup] La versión de loader solicitada (${requestedLoaderVersion}) no está disponible, usando ${selectedLoaderVersion}`)
      }
    }

    const customVersionName = `fabric-${mcVersion}-${selectedLoaderVersion}`
    const versionDir = path.join(instancePath, 'versions', customVersionName)
    await fs.mkdir(versionDir, { recursive: true })
    const jsonPath = path.join(versionDir, `${customVersionName}.json`)

    const profileRes = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${selectedLoaderVersion}/profile/json`)
    if (!profileRes.ok) {
      throw new Error(`Error al descargar el perfil de Fabric: ${profileRes.status}`)
    }

    const profileJson = await profileRes.json()
    await fs.writeFile(jsonPath, JSON.stringify(profileJson, null, 2))
    console.log(`[Fabric Setup] Configurado correctamente: ${customVersionName}`)

    return customVersionName
  } catch (err) {
    console.error('[Fabric Setup] Error al configurar Fabric:', err)
    return null
  }
}

async function extractArchive(tempFile: string, destination: string, isWin: boolean): Promise<void> {
  if (isWin) {
    const quotedTemp = `"${tempFile.replace(/"/g, '""')}"`
    const quotedDest = `"${destination.replace(/"/g, '""')}"`
    await execAsync(`powershell -NoProfile -Command Expand-Archive -LiteralPath ${quotedTemp} -DestinationPath ${quotedDest} -Force`)
  } else {
    await execAsync(`tar -xf "${tempFile}" -C "${destination}"`)
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

// --- NUEVAS REFERENCIAS A LAS VENTANAS SECUNDARIAS ---
let createInstanceWin: BrowserWindow | null = null
let modsManagerWin: BrowserWindow | null = null

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

function openModsManagerWindow(parentWindow: BrowserWindow, instanceId: string, instanceName: string, version: string, loader: string): void {
  if (modsManagerWin) {
    modsManagerWin.focus()
    return
  }

  modsManagerWin = new BrowserWindow({
    width: 1180,
    height: 760,
    parent: parentWindow,
    modal: false,
    show: false,
    autoHideMenuBar: true,
    resizable: true,
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  })

  modsManagerWin.on('ready-to-show', () => {
    modsManagerWin?.show()
  })

  modsManagerWin.on('closed', () => {
    modsManagerWin = null
  })

  const hash = `mods-manager?instanceId=${encodeURIComponent(instanceId)}&instanceName=${encodeURIComponent(instanceName)}&version=${encodeURIComponent(version)}&loader=${encodeURIComponent(loader)}`

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    modsManagerWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/${hash}`)
  } else {
    modsManagerWin.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
}

function createWindow(): void {
  // 1. Cargamos los ajustes antes de crear la ventana
  getSettings().then(settings => {
    const mainWindow = new BrowserWindow({
      width: settings.windowWidth || 900,
      height: settings.windowHeight || 670,
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

    // 2. Guardar tamaño cuando el usuario termina de redimensionar
    let resizeTimeout: NodeJS.Timeout
    mainWindow.on('resize', () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(async () => {
        const [width, height] = mainWindow.getSize()
        const currentSettings = await getSettings()
        await saveSettings({ 
          ...currentSettings, 
          windowWidth: width, 
          windowHeight: height 
        })
      }, 500)
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
  })
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
      loaderVersion: data.loaderVersion,
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

  ipcMain.on('open-mods-manager-window', (event, instanceId: string, instanceName: string, version: string, loader: string) => {
    const parent = BrowserWindow.fromWebContents(event.sender)
    if (parent) {
      openModsManagerWindow(parent, instanceId, instanceName, version, loader)
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

      const isFabricInstance = instance.loader.toLowerCase().includes('fabric')

      if (isFabricInstance) {
        event.sender.send('download-progress', {
          percentage: 0, speed: '', phase: 'Preparando entorno de Java y Fabric...', isDownloading: true
        });
      }

      const [customJavaPath, fabricVersion] = await Promise.all([
        ensureJava(instance.version, event),
        isFabricInstance
          ? setupFabric(instancePath, instance.version, instance.loaderVersion)
          : Promise.resolve(undefined)
      ]);

      const assetMetadata = await buildAssetDownloadMetadata(instancePath, instance.version, fabricVersion || undefined)

      if (isFabricInstance && !fabricVersion) {
        throw new Error('No se pudo configurar Fabric para la versión seleccionada.')
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

      const opts: any = {
        authorization: auth as any,
        root: instancePath,
        version: {
          number: instance.version,
          type: fabricVersion ? 'custom' : 'release'
        },
        memory: {
          max: `${currentSettings.javaMaxMemory}G`,
          min: `${currentSettings.javaMinMemory}G`
        },
        javaPath: customJavaPath,
        overrides: {
          maxSockets: 8
        },
        timeout: 300000
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
          console.log(`[Raw Status] Tipo: ${status.type} | Descargado: ${status.current} / ${status.total}`);

          const type = (status.type as string) || 'archivos';
          const current = Number(status.current) || 0;
          const total = Number(status.total) || 0;
          const currentTimestamp = Date.now();

          if (currentPhase !== type) {
            currentPhase = type;
            downloadTracker.lastBytesDownloaded = current;
            downloadTracker.lastTimestamp = currentTimestamp;
          }

          const phaseNames: Record<string, string> = {
            classes: 'Librerías',
            jar: 'Cliente',
            natives: 'Nativos',
            assets: 'Sonidos y texturas',
            libraries: 'Librerías',
            metadata: 'Metadatos',
            resources: 'Recursos',
            client: 'Cliente'
          };
          const phaseName = phaseNames[type] || type;

          let percentage = total > 0 ? Math.round((current / total) * 100) : 0;
          let speed = '';
          const currentFile = typeof status.name === 'string' ? status.name : undefined;
          let downloadFile: string | undefined
          let remainingBytes: number | undefined
          let totalBytes: number | undefined

          if (type === 'assets' && currentFile) {
            const fileLabel = assetMetadata?.hashToAssetPath[currentFile]
            downloadFile = fileLabel || `assets/objects/${currentFile.slice(0, 2)}/${currentFile}`
            totalBytes = assetMetadata?.missingBytes
            remainingBytes = assetMetadata ? Math.max(assetMetadata.missingBytes - current, 0) : undefined
          }

          if (total > 0) {
            const timeDelta = Math.max(currentTimestamp - downloadTracker.lastTimestamp, 1);
            const bytesDelta = Math.max(current - downloadTracker.lastBytesDownloaded, 0);

            if (timeDelta >= 500) {
              const speedMBps = (bytesDelta / timeDelta) * 1000 / (1024 * 1024);
              speed = `${speedMBps.toFixed(2)} MB/s`;
              downloadTracker.lastBytesDownloaded = current;
              downloadTracker.lastTimestamp = currentTimestamp;
            }
          }

          event.sender.send('download-progress', {
            percentage,
            speed,
            phase: `Descargando ${phaseName.toLowerCase()}...`,
            isDownloading: true,
            downloadFile,
            remainingBytes,
            totalBytes
          });
        } catch (err) {
          console.error('Error calculando progreso visual:', err)
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
      fs.rm(instanceFolder, { recursive: true, force: true })
        .then(() => console.log(`[Main Process] Instancia ${id} eliminada del disco.`))
        .catch((error) => console.error(`[Main Process] Error eliminando carpeta de instancia ${id}:`, error))

      console.log(`[Main Process] Instancia ${id} eliminada de la lista.`)
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

// --- BUSCAR MODS ---
  ipcMain.handle('search-mods', async (_, query: string, mcVersion?: string, loader?: string) => {
    try {
      const versionMap: Record<string, string> = {
        '26.1': '1.21.1'
      }
      const facets: string[][] = [["categories:fabric"]]

      if (mcVersion) {
        const mappedVersion = versionMap[mcVersion] || mcVersion
        facets.unshift([`versions:${mappedVersion}`])
      }

      if (loader) {
        const loaderString = loader.toLowerCase()
        const loaderCategory = loaderString.includes('fabric')
          ? 'fabric'
          : loaderString.includes('quilt')
          ? 'quilt'
          : loaderString.includes('forge')
          ? 'forge'
          : loaderString.includes('neoforge')
          ? 'neoforge'
          : loaderString.includes('babric')
          ? 'babric'
          : 'fabric'
        facets.push([`categories:${loaderCategory}`])
      }

      const params = new URLSearchParams({
        query: query || '',
        facets: JSON.stringify(facets),
        limit: '30',
        sort: 'downloads'
      })

      const url = `https://api.modrinth.com/v2/search?${params}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Error: ${response.statusText}`)
      const data: ModrinthSearchResult = await response.json()

      const mappedVersion = mcVersion ? versionMap[mcVersion] || mcVersion : undefined
      const loaderCategory = loader ? (
        loader.toLowerCase().includes('fabric') ? 'fabric' :
        loader.toLowerCase().includes('quilt') ? 'quilt' :
        loader.toLowerCase().includes('forge') ? 'forge' :
        loader.toLowerCase().includes('neoforge') ? 'neoforge' :
        loader.toLowerCase().includes('babric') ? 'babric' :
        undefined
      ) : undefined

      const compatibleHits = data.hits.filter((hit: any) => {
        if (mappedVersion && Array.isArray(hit.versions) && !hit.versions.includes(mappedVersion)) {
          return false
        }
        if (loaderCategory && Array.isArray(hit.categories) && !hit.categories.includes(loaderCategory)) {
          return false
        }
        return true
      })

      return compatibleHits
    } catch (error) {
      console.error('[Modrinth] Error:', error)
      throw error
    }
  })

  // --- INSTALAR MOD Y SUS DEPENDENCIAS (RECURSIVO) ---
// --- INSTALAR MOD Y SUS DEPENDENCIAS (RECURSIVO) ---
  ipcMain.handle('install-mod', async (_, projectId: string, instanceId: string, mcVersion: string, loader: string) => {
    try {
      const loaderString = loader.toLowerCase()
      const loaderParam = loaderString.includes('fabric')
        ? 'fabric'
        : loaderString.includes('quilt')
        ? 'quilt'
        : loaderString.includes('forge')
        ? 'forge'
        : loaderString.includes('neoforge')
        ? 'neoforge'
        : loaderString.includes('babric')
        ? 'babric'
        : 'fabric'
      const modsPath = path.join(app.getPath('userData'), 'instances', instanceId, 'mods')

      await fsSync.promises.mkdir(modsPath, { recursive: true })

      const versionMap: Record<string, string> = {
        '26.1': '1.21.1'
      }
      const mappedVersion = versionMap[mcVersion] || mcVersion

      const processedProjects = new Set<string>()
      const downloadedFiles: string[] = []

      const downloadModWithDeps = async (id: string, isVersionId: boolean = false) => {
        if (processedProjects.has(id)) return

        let versionData: any
        if (isVersionId) {
          const res = await fetch(`https://api.modrinth.com/v2/version/${id}`)
          if (!res.ok) throw new Error(`Failed to fetch version ${id}: ${res.status}`)
          versionData = await res.json()
        } else {
          const params = new URLSearchParams({
            game_versions: JSON.stringify([mappedVersion]),
            loaders: JSON.stringify([loaderParam])
          })
          const url = `https://api.modrinth.com/v2/project/${id}/version?${params}`
          const res = await fetch(url)
          if (!res.ok) throw new Error(`Failed to fetch project ${id}: ${res.status}`)
          const versions = await res.json()
          if (!Array.isArray(versions) || versions.length === 0) {
            throw new Error(`No compatible Modrinth version found for project ${id} with MC ${mappedVersion} and loader ${loaderParam}`)
          }
          versionData = versions[0]
        }

        const projectIdToMark = versionData.project_id || id
        if (!projectIdToMark) throw new Error('No project_id available for downloaded version')
        processedProjects.add(projectIdToMark)

        const files = Array.isArray(versionData.files) ? versionData.files : []
        const validFiles = files.filter((file: any) => typeof file.filename === 'string' && file.filename.toLowerCase().endsWith('.jar'))
        if (validFiles.length === 0) {
          throw new Error(`No valid .jar files available for project ${projectIdToMark}`)
        }

        const primaryFile = validFiles.find((file: any) => file.primary) || validFiles[0]
        if (!primaryFile || !primaryFile.url) {
          throw new Error(`No downloadable primary .jar found for project ${projectIdToMark}`)
        }

        const filePath = path.join(modsPath, primaryFile.filename)
        if (!fsSync.existsSync(filePath)) {
          console.log(`[Modrinth] Descargando: ${primaryFile.filename}...`)
          const fileResponse = await fetch(primaryFile.url)
          if (!fileResponse.ok) {
            throw new Error(`Failed to download ${primaryFile.filename}: ${fileResponse.status}`)
          }

          const fileStream = fsSync.createWriteStream(filePath)
          const body = Readable.fromWeb(fileResponse.body as any)
          body.pipe(fileStream)
          await finished(fileStream)
          downloadedFiles.push(primaryFile.filename)
        }

        if (Array.isArray(versionData.dependencies)) {
          for (const dep of versionData.dependencies) {
            if (dep.dependency_type !== 'required') continue
            if (dep.version_id) {
              await downloadModWithDeps(dep.version_id, true)
            } else if (dep.project_id) {
              await downloadModWithDeps(dep.project_id, false)
            }
          }
        }
      }

      await downloadModWithDeps(projectId, false)

      if (downloadedFiles.length === 0) {
        return {
          success: false,
          message: 'No se descargó ningún archivo válido. Puede que la versión no sea compatible o el mod no tenga un .jar instalable.',
          downloadedFiles: []
        }
      }

      return {
        success: true,
        message: downloadedFiles.length === 1 ? `Mod instalado: ${downloadedFiles[0]}` : `Se instalaron ${downloadedFiles.length} archivos.`,
        downloadedFiles
      }
    } catch (error: any) {
      console.error('[Modrinth] Error instalando mod:', error)
      return { success: false, message: error.message || 'Error desconocido instalando mod.', downloadedFiles: [] }
    }
  })

  // --- GESTIÓN DE MODS INSTALADOS ---
  ipcMain.handle('get-installed-mods', async (_, instanceId: string) => {
    try {
      const modsPath = path.join(app.getPath('userData'), 'instances', instanceId, 'mods')
      if (!fsSync.existsSync(modsPath)) return []
      
      const files = await fs.readdir(modsPath)
      return files
        .filter(file => file.endsWith('.jar') || file.endsWith('.jar.disabled'))
        .map(file => ({
          fileName: file,
          isEnabled: !file.endsWith('.disabled')
        }))
    } catch (error) {
      console.error('[Mods] Error leyendo carpeta de mods:', error)
      return []
    }
  })

  ipcMain.handle('toggle-mod', async (_, instanceId: string, fileName: string) => {
    try {
      const modsPath = path.join(app.getPath('userData'), 'instances', instanceId, 'mods')
      const oldPath = path.join(modsPath, fileName)
      const isCurrentlyDisabled = fileName.endsWith('.disabled')
      
      const newFileName = isCurrentlyDisabled 
        ? fileName.replace('.disabled', '') 
        : `${fileName}.disabled`
        
      const newPath = path.join(modsPath, newFileName)
      
      await fsSync.promises.rename(oldPath, newPath)
      return { success: true, newFileName }
    } catch (error: any) {
      console.error('[Mods] Error al alternar mod:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('delete-mod', async (_, instanceId: string, fileName: string) => {
    try {
      const filePath = path.join(app.getPath('userData'), 'instances', instanceId, 'mods', fileName)
      await fsSync.promises.unlink(filePath)
      return { success: true }
    } catch (error: any) {
      console.error('[Mods] Error al borrar mod:', error)
      return { success: false, message: error.message }
    }
  })

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

ipcMain.on('open-mods-folder', (_, instanceId: string) => {
    const modsPath = path.join(app.getPath('userData'), 'instances', instanceId, 'mods');
    
    // Si la carpeta no existe (instancia nueva), la creamos para que no de error
    if (!fsSync.existsSync(modsPath)) {
      fsSync.mkdirSync(modsPath, { recursive: true });
    }
    
    shell.openPath(modsPath).catch(err => {
      console.error('[Explorer] Error al abrir carpeta de mods:', err);
    });
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})