import { app, protocol, net, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { loadPlugins, replaceForSource } from '@cinny-electron/core'
import icon from '../../../resources/tray-icon/cinny.png?asset'
import { createTray } from './tray'
import { startQuickCSSWatch } from './quickcss'
import { addWebContextMenu, updateAutostart } from './util'

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

app.whenReady().then(async () => {
  electronApp.setAppUserModelId(app.name)

  config.onDidChange('autostart', (newVal) => updateAutostart(newVal))
  await updateAutostart(config.get('autostart')!)

  await createWindow()
})
