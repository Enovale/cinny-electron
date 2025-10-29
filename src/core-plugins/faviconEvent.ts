import { PluginExports } from '@cinny-electron/types'

export const patches: PluginExports['patches'] = [
  {
    find: /(,\i\(\i\?\i\?\i:\i:\i\))/,
    replace: {
      match: /(,\i\((\i)\?(\i)\?\i:\i:\i\))/,
      replacement: `$1;console.log(\`Favicon changed. Total: \${$2}, Highlight: \${$3}\`)`
    }
  }
]
