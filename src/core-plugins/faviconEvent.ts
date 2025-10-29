import { PluginExports } from '@cinny-electron/types'

export const patches: PluginExports['patches'] = [
  {
    find: /(,\i\(\i\?\i\?\i:\i:\i\))/,
    replace: {
      match: /(,\i\((\i)\?(\i)\?\i:\i:\i\))/,
      replacement: `$1;${alertFaviconChange}alertFaviconChange($2, $3)`
    }
  }
]

function alertFaviconChange(total: boolean, highlight: boolean): void {
  console.log(`Favicon changed. Total: ${total}, Highlight: ${highlight}`)
}
