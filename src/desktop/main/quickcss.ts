import { readFileSync, watch, writeFileSync, existsSync, WatchEventType } from 'fs'
import { join } from 'path'
import { mainWindow } from './index'
import { IpcEvents } from '@cinny-electron/core'
import { dataDir } from './util'

export const quickCssPath = join(dataDir, 'quickCSS.css')

export function startQuickCSSWatch(): void {
  console.log('Starting quickcss')
  if (!existsSync(quickCssPath)) {
    writeFileSync(quickCssPath, '')
  }
  watch(quickCssPath, watchCallback)
  watchCallback(null)
}

function watchCallback(e: WatchEventType | null): void {
  console.log('quickcss access: ', e)
  mainWindow?.webContents.send(IpcEvents.QUICKCSS_CHANGED, readFileSync(quickCssPath).toString())
}
