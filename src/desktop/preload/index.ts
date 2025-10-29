import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IpcEvents } from '@cinny-electron/core'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

const quickCssEvent = new Event('quickCssChanged')
const quickCssStyle = document.createElement('style')

document.onreadystatechange = async () => {
  if (document.readyState == 'complete') {
    document.head.appendChild(quickCssStyle)

    ipcRenderer.on(IpcEvents.QUICKCSS_CHANGED, (_e, css) => {
      console.log('Quickcss Changed!: ', css)
      document.dispatchEvent(quickCssEvent)
      quickCssStyle.innerHTML = css
    })
  }
}
