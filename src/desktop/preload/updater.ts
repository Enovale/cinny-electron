// Listen for messages
import { contextBridge, ipcRenderer } from 'electron'
import { IpcEvents } from '@cinny-electron/core'

contextBridge.exposeInMainWorld('checkForUpdates', () => {
  const container = document.getElementById('messages')
  if (container) container.innerHTML = ''
  ipcRenderer.send(IpcEvents.CHECK_UPDATES)
})

ipcRenderer.on('status', function (_event, text) {
  const container = document.getElementById('messages')
  const message = document.createElement('div')
  message.innerHTML = text
  container?.appendChild(message)
})
