import { app, BrowserWindow, shell } from 'electron'
import { mainWindow, quitApp } from './index'
import { join } from 'path'

export const dataDir = process.env.CINNY_USER_DATA_DIR || join(app.getPath('userData'))

export function relaunch(): void {
  app.relaunch()
  quitApp()
}

export function createAboutPage(): void {
  const about = new BrowserWindow({
    width: 800,
    height: 600,
    center: true,
    autoHideMenuBar: true,
    parent: mainWindow
  })

  about.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const data = new URLSearchParams({
    APP_VERSION: app.getVersion()
  })

  const view = join(__dirname, '../renderer/about/index.html')
  const url = new URL(`file://${view}`)
  url.search = data.toString()
  about.loadURL(url.toString())
}
