import {
  app,
  protocol,
  net,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { Conf } from 'electron-conf/main'
import { IpcEvents, loadPlugins, replaceForSource } from '@cinny-electron/core'
import icon from '../../resources/icon.png?asset'

const configDefault = {
  enableQuickCSS: true,
  url: 'https://app.cinny.in'
}

let config: Conf
let tray: Tray = null
const trayCache: Map<string, Electron.NativeImage> = new Map()

async function createWindow(): Promise<void> {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
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

function createTray(): void {
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'About'
      //click: createAboutPage
    },
    {
      type: 'separator'
    },
    {
      label: 'Restart',
      click() {
        app.relaunch()
        app.quit()
      }
    },
    {
      label: 'Quit',
      type: 'normal',
      click: () => {
        quitApp()
      }
    }
  ])
  tray.setToolTip('Cinny Electron.')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    toggleWindow()
  })
  ipcMain.on(IpcEvents.FAVICON_CHANGED, (e, args) => {
    const str = args as string
    if (trayCache.has(str)) {
      console.log('Favicon cache hit!')
      tray.setImage(trayCache.get(str))
      return
    }
    console.log('Favicon cache miss!')
    try {
      const data = decodeURIComponent(str.replace('data:image/svg+xml,', ''))
      const svg = new Resvg(data)
      const image = nativeImage.createFromBuffer(svg.render().asPng())
      tray.setImage(image)
      trayCache.set(str, image)
    } catch (e) {
      console.error(e)
      console.error(str)
    }
  })
}

function onReady(): void {
  createTray()
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
  electronApp.setAppUserModelId('com.electron')

  setupConfig()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  await createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
