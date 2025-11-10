import { app, BrowserWindow, shell } from 'electron'
import { mainWindow, quitApp } from './index'
import { join, resolve } from 'path'
import xdg from '@folder/xdg'
import { existsSync, unlink, writeFileSync } from 'fs'
import which from 'which'
import contextMenu from 'electron-context-menu'
import { electronApp } from '@electron-toolkit/utils'

export const dataDir = process.env.CINNY_USER_DATA_DIR || join(app.getPath('userData'))

export function relaunch(): void {
  app.relaunch()
  quitApp()
}

export function createAboutPage(): void {
  const about = new BrowserWindow({
    width: 400,
    height: 400,
    center: true,
    autoHideMenuBar: true,
    resizable: false,
    maximizable: false,
    frame: true,
    modal: true,
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
    window: window,
    shouldShowMenu: (_event, parameters) => parameters.isEditable
  })
}
