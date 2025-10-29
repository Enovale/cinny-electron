import { PluginExports } from '@cinny-electron/types'
import { IpcEvents } from '@cinny-electron/core'
import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export const patches: PluginExports['patches'] = [
  {
    find: /(,\i\(\i\?\i\?\i:\i:\i\))/,
    replace: {
      match: /(,\i\((\i)\?(\i)\?\i:\i:\i\))/,
      replacement: `$1;${alertFaviconChange.toString().replaceAll(`{{EVENT}}`, IpcEvents.FAVICON_CHANGED)}alertFaviconChange($2, $3)`
    }
  }
]

function alertFaviconChange(total: boolean, highlight: boolean): void {
  console.log(`Favicon changed. Total: ${total}, Highlight: ${highlight}`)
  window.electron.ipcRenderer.send('{{EVENT}}', total, highlight)
}
