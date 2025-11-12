import { readFileSync, watch, writeFileSync, existsSync, WatchEventType } from 'fs'
import { join } from 'path'
import { mainWindow } from './index'
import { IpcEvents } from '@cinny-electron/core'
import { dataDir } from './util'
import { ipcMain } from 'electron'
import log from 'electron-log/main'

export const quickCssPath = join(dataDir, 'quickCSS.css')

export function startQuickCSSWatch(): void {
  log.info('Starting quickcss')
  if (!existsSync(quickCssPath)) {
    writeFileSync(quickCssPath, '')
  }

  // We should handle the renderer loading and resend the quickcss
  ipcMain.on(IpcEvents.RENDERER_LOADED, () => watchCallback(null))
  watch(quickCssPath, watchCallback)
  watchCallback(null)
}

function watchCallback(e: WatchEventType | null): void {
  log.info('quickcss access: ', e)
  mainWindow?.webContents.send(IpcEvents.QUICKCSS_CHANGED, readFileSync(quickCssPath).toString())
}
