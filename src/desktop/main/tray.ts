import { app, ipcMain, Menu, shell, Tray } from 'electron'
import { createAboutPage, relaunch } from './util'
import normalIcon from '../../../resources/tray-icon/cinny.png?asset'
import unreadIcon from '../../../resources/tray-icon/cinny-unread.png?asset'
import highlightIcon from '../../../resources/tray-icon/cinny-highlight.png?asset'
import { IpcEvents } from '@cinny-electron/core'
import { config, getAutoUpdater, quitApp, toggleWindow } from './index'
import { quickCssPath } from './quickcss'

let tray: Tray

export function createTray(): void {
  tray = new Tray(normalIcon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'About',
      click: createAboutPage
    },
    {
      label: 'Open QuickCSS',
      click() {
        shell.openExternal('file://' + quickCssPath)
      }
    },
    {
      label: 'Start Minimized',
      type: 'checkbox',
      checked: config.get<string, boolean>('startHidden'),
      click({ checked }) {
        config.set('startHidden', checked)
        updateTray(contextMenu)
      }
    },
    {
      label: 'Autostart',
      type: 'checkbox',
      checked: config.get<string, boolean>('autostart'),
      click({ checked }) {
        config.set('autostart', checked)
        updateTray(contextMenu)
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Check for Updates',
      enabled: app.isPackaged,
      click() {
        getAutoUpdater().checkForUpdatesAndNotify()
      }
    },
    {
      label: 'Restart',
      click: relaunch
    },
    {
      label: 'Quit',
      type: 'normal',
      click: quitApp
    }
  ])
  tray.setToolTip('Cinny')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    toggleWindow()
  })
  ipcMain.on(IpcEvents.FAVICON_CHANGED, (_e, unread: boolean, highlight: boolean) => {
    tray.setImage(unread ? (highlight ? highlightIcon : unreadIcon) : normalIcon)
  })
}

function updateTray(menu: Menu): void {
  tray.setContextMenu(menu)
}
