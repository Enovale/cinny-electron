import { session } from 'electron'
import { resolve } from 'path'
import { Conf } from 'electron-conf/main'

const conf = new Conf({
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
