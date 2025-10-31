import { ipcMain, Menu, Tray } from 'electron'
import { createAboutPage, relaunch } from './util'
import normalIcon from '../../../resources/tray-icon/cinny.png?asset'
import unreadIcon from '../../../resources/tray-icon/cinny-unread.png?asset'
import highlightIcon from '../../../resources/tray-icon/cinny-highlight.png?asset'
import { IpcEvents } from '@cinny-electron/core'
import { quitApp, toggleWindow } from './index'

let tray: Tray

export function createTray(): void {
  tray = new Tray(normalIcon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'About',
      click: createAboutPage
    },
    {
      type: 'separator'
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
