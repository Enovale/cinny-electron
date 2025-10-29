import { readFileSync, watch } from 'fs'
import { join } from 'path'
import { mainWindow } from './index'
import { IpcEvents } from '@cinny-electron/core'
import { dataDir } from './util'

const filePath = join(dataDir, 'quickCSS.css')

export function startQuickCSSWatch(): void {
  console.log('Starting quickcss')
  watch(filePath, watchCallback)
  watchCallback(null)
}

function watchCallback(e): void {
  console.log('quickcss access: ', e)
  mainWindow?.webContents.send(IpcEvents.QUICKCSS_CHANGED, readFileSync(filePath).toString())
}
