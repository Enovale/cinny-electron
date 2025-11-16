import { app, BrowserWindow, shell } from 'electron'
import { mainWindow, quitApp } from './index'
import { join, resolve } from 'path'
import xdg from '@folder/xdg'
import { existsSync, unlink, writeFileSync } from 'fs'
import which from 'which'
import contextMenu from 'electron-context-menu'
import { electronApp } from '@electron-toolkit/utils'
import log from 'electron-log/main'

export const dataDir = process.env.CINNY_USER_DATA_DIR || join(app.getPath('userData'))

let updateWin: BrowserWindow | null = null
const modalProps = {
  center: true,
  autoHideMenuBar: true,
  resizable: false,
  maximizable: false,
  frame: true,
  modal: true
}

export function relaunch(): void {
  app.relaunch()
  quitApp()
}

export function openView(win: BrowserWindow, page: string): void {
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const data = new URLSearchParams({
    APP_VERSION: app.getVersion()
  })

  const view = join(__dirname, page)
  const url = new URL(`file://${view}`)
  url.search = data.toString()
  win.loadURL(url.toString())
}

export async function updateAutostart(autostart: boolean | undefined): Promise<void> {
  if (typeof autostart === 'undefined') return

  if (process.platform != 'linux') {
    electronApp.setAutoLaunch(autostart)
  } else {
    try {
      const autostartFile = join(xdg.linux().config, 'autostart', `${app.name}.desktop`)
      const executable =
        process.env.APPIMAGE ??
        (process.argv.length >= 2
          ? `${process.execPath} ${resolve(process.argv[1])}`
          : await which(app.name))

      if (autostart) {
        // We should always overwrite the file because the path might change (e.g. AppImage)
        //if (existsSync(autostartFile)) return

        writeFileSync(
          autostartFile,
          `[Desktop Entry]
Name=Cinny
Exec=${executable} %U
Terminal=false
Type=Application
Icon=${app.name}
StartupWMClass=${app.name}
GenericName=Internet Messenger
Categories=Network;
Keywords=matrix;cinny;electron;chat;
Comment=Yet another matrix client
MimeType=x-scheme-handler/matrix;`
        )
      } else {
        if (existsSync(autostartFile)) unlink(autostartFile, () => {})
      }
    } catch (err) {
      console.error(err)
    }
  }
}

export function addWebContextMenu(window: BrowserWindow): void {
  contextMenu({
    window: window
  })
}

export function aboutWindow(): void {
  const win = new BrowserWindow({
    width: 400,
    height: 400,
    parent: mainWindow,
    ...modalProps
  })
  openView(win, '../renderer/about/index.html')
}

export function sendStatusToUpdaterWindow(text: string): void {
  log.info(text)
  updateWin?.webContents.send('status', text)
}

export function updaterWindow(): void {
  updateWin = new BrowserWindow({
    width: 400,
    height: 400,
    parent: mainWindow,
    webPreferences: {
      preload: join(__dirname, '../preload/updater.mjs'),
      sandbox: false
    },
    ...modalProps
  })
  openView(updateWin, '../renderer/updater/index.html')
}
