import { app, protocol, net, shell, BrowserWindow, ipcMain } from 'electron'
import { join, resolve } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { IpcEvents, loadPlugins, replaceForSource } from '@cinny-electron/core'
import icon from '../../../resources/tray-icon/cinny.png?asset'
import { createTray } from './tray'
import { startQuickCSSWatch } from './quickcss'
import { addWebContextMenu, sendStatusToUpdaterWindow, updateAutostart } from './util'
import electronUpdater, { type AppUpdater, UpdateCheckResult } from 'electron-updater'
import log from 'electron-log/main'

export const configDefault = {
  enableQuickCSS: true,
  autostart: false,
  startHidden: false,
  url: 'https://app.cinny.in'
}

export const config = new Store({
  name: 'settings',
  defaults: configDefault
})

export let mainWindow: BrowserWindow | undefined
let quitting: boolean = false
const autoUpdater = getAutoUpdater()

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('matrix', process.execPath, [resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('matrix')
}

if (!app.requestSingleInstanceLock()) {
  app.exit()
}

app.on('before-quit', () => {
  quitting = true
})

async function createWindow(): Promise<void> {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      spellcheck: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!config.get('startHidden')) mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (event) => {
    if (quitting) {
      return
    } else {
      event.preventDefault()
      if (process.platform === 'darwin') app.hide()
      else mainWindow?.hide()
    }
  })

  addWebContextMenu(mainWindow)

  const url = getURL()

  await loadPlugins()

  protocol.handle('https', async (req: GlobalRequest): Promise<Response> => {
    const originalResponse = net.fetch(req, { bypassCustomProtocolHandlers: true })
    const reqUrl = new URL(req.url)
    // TODO: Make this check a little less specific to the way the config is set
    if (reqUrl.host === new URL(url).host && reqUrl.pathname.endsWith('.js')) {
      const responseVal = await originalResponse
      let responseStr = await responseVal.text()
      responseStr = await replaceForSource(responseStr)
      // @ts-ignore Bugged??
      return new Response(responseStr, {
        headers: responseVal.headers,
        status: responseVal.status,
        statusText: responseVal.statusText
      })
    } else {
      return originalResponse
    }
  })

  mainWindow.loadURL(url).then(() => {
    onReady()
  })

  if (is.dev) mainWindow.webContents.openDevTools()
}

function onReady(): void {
  createTray()
  if (config.get('enableQuickCSS')) startQuickCSSWatch()
}

export function toggleWindow(): void {
  if (mainWindow?.isVisible()) mainWindow!.hide()
  else mainWindow?.show()
}

export function quitApp(): void {
  quitting = true
  if (mainWindow) mainWindow.close()

  app.quit()
}

function getURL(): string {
  return (
    process.env.CINNY_DEVELOPMENT_SERVER ??
    config.get<string, string>('url') ??
    'https://app.cinny.in'
  )
}

// Assumed url is in format `matrix:r/roomname:homeserver?action=join`
function handleUrlOpen(url: string | undefined): void {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
  }

  if (url?.startsWith('matrix:')) {
    const base = url?.slice('matrix:'.length, url?.length)
    if (base) {
      const room = base.split('?action=')[1]
      // Only know how to manually deal with r/ links
      if (!room.startsWith('r/')) return
      if (mainWindow) {
        const url = new URL(getURL())
        url.pathname = '/home/' + encodeURIComponent(room.replace('r/', '#'))
        mainWindow.webContents.loadURL(url.toString())
      }
    }
  }
}

// macOS handler for single instance redirection. TODO This may need different parsing.
app.on('open-url', (_event, url) => {
  handleUrlOpen(url)
})

app.on('second-instance', (_event, commandLine) => {
  handleUrlOpen(commandLine.pop())
})

function initializeLogging(): void {
  log.initialize()
  log.transports.file.level = 'debug'
  log.transports.console.level = 'info'
  log.errorHandler.startCatching()

  autoUpdater.logger = log
}

app.whenReady().then(async () => {
  // We have to enable unsafe-eval for Cinny so we can just disable these
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
  initializeLogging()
  log.info(`${app.name} starting...`)

  electronApp.setAppUserModelId(app.name)

  // Set up autoupdater events
  autoUpdater.on('checking-for-update', () => {
    sendStatusToUpdaterWindow('Checking for update...')
  })
  autoUpdater.on('update-available', () => {
    sendStatusToUpdaterWindow('Update available.')
  })
  autoUpdater.on('update-not-available', () => {
    sendStatusToUpdaterWindow('Update not available.')
  })
  autoUpdater.on('error', (err) => {
    sendStatusToUpdaterWindow('Error in auto-updater. ' + err)
  })
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
    log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')'
    sendStatusToUpdaterWindow(log_message)
  })
  autoUpdater.on('update-downloaded', () => {
    sendStatusToUpdaterWindow('Update downloaded')
  })

  ipcMain.on(IpcEvents.CHECK_UPDATES, checkForUpdates)
  checkForUpdates()

  config.onDidChange('autostart', (newVal) => updateAutostart(newVal))
  await updateAutostart(config.get('autostart')!)

  await createWindow()
})

export function checkForUpdates(): Promise<UpdateCheckResult | null> {
  if (!app.isPackaged) return new Promise(() => resolve())
  return autoUpdater.checkForUpdatesAndNotify()
}

export function getAutoUpdater(): AppUpdater {
  // Using destructuring to access autoUpdater due to the CommonJS module of 'electron-updater'.
  // It is a workaround for ESM compatibility issues, see https://github.com/electron-userland/electron-builder/issues/7976.
  const { autoUpdater } = electronUpdater
  return autoUpdater
}
