import { app, protocol, net, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { Conf } from 'electron-conf/main'
import { loadPlugins, replaceForSource } from '@cinny-electron/core'
import icon from '../../../resources/tray-icon/cinny.png?asset'
import { createTray } from './tray'
import { startQuickCSSWatch } from './quickcss'

const configDefault = {
  enableQuickCSS: true,
  url: 'https://app.cinny.in'
}

export let mainWindow: BrowserWindow | undefined
let quitting: boolean = false

app.on('before-quit', () => {
  quitting = true
})

let config: Conf

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
    mainWindow?.show()
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

  const url = getURL()

  await loadPlugins()

  protocol.handle('https', async (req) => {
    const originalResponse = net.fetch(req, { bypassCustomProtocolHandlers: true })
    const reqUrl = new URL(req.url)
    // TODO: Make this check a little less specific to the way the config is set
    if (reqUrl.host === new URL(url).host && reqUrl.pathname.endsWith('.js')) {
      const responseVal = await originalResponse
      let responseStr = await responseVal.text()
      responseStr = await replaceForSource(responseStr)
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
  if (config.get('enableQuickCSS', configDefault.enableQuickCSS)) startQuickCSSWatch()
}

export function toggleWindow(): void {
  if (mainWindow?.isVisible()) mainWindow.hide()
  else mainWindow?.show()
}

export function quitApp(): void {
  quitting = true
  if (mainWindow) mainWindow.close()

  app.quit()
}

function getURL(): string {
  return (config.get('url', configDefault.url) as string) ?? 'https://app.cinny.in'
}

function setupConfig(): void {
  config = new Conf({
    name: 'settings',
    defaults: configDefault
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId(app.name)

  setupConfig()

  await createWindow()
})
