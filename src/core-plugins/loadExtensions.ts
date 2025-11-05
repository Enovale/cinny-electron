import { session } from 'electron'
import { resolve } from 'path'
import Store from 'electron-store'

const conf = new Store({
  name: 'loadExtensions',
  defaults: {
    extensionPaths: []
  }
})

for (const path of conf.get('extensionPaths', [])) {
  try {
    await session.defaultSession.extensions.loadExtension(resolve(path), {
      allowFileAccess: true
    })
  } catch (e) {
    console.error(`Failed to load extension ${path}:`, e)
  }
}
