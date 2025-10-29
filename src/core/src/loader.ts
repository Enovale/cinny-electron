import * as fs from 'fs/promises'
import { join } from 'path'
import { PatchMatch, PatchReplace, PluginExports } from '@cinny-electron/types'

export const pluginList: PluginExports[] = []

export function replaceRegex(match: PatchMatch): string | RegExp {
  if (!(match instanceof RegExp)) {
    return match
  }
  return new RegExp(match.source.replace(/\\i/g, '[A-Za-z_$]{1,3}[\\w$]*'), match.flags)
}

export async function loadPlugins(): Promise<void> {
  const files = await fs.readdir(join(__dirname, '../plugins/'), {
    recursive: true,
    withFileTypes: true
  })
  for (const file of files) {
    if (!file.isDirectory() && (file.name.endsWith('.js') || file.name.endsWith('.ts'))) {
      try {
        const url = join(file.parentPath, file.name)
        const module = await import(url)
        console.log(module)
        pluginList.push(module)
      } catch (e) {
        console.error(`Failed to import ${file.name}: ${e}`)
      }
    }
  }
  console.log(files)
}

export async function replaceForSource(source: string): Promise<string> {
  try {
    for (const plugin of pluginList) {
      if (!plugin) {
        throw new Error('Plugin is empty!')
      }
      if (!plugin.patches) {
        continue
      }

      for (const patch of plugin.patches) {
        if (source.match(replaceRegex(patch.find))) {
          const replacements: PatchReplace[] = Array.isArray(patch.replace)
            ? patch.replace
            : [patch.replace]
          for (const replace of replacements) {
            console.log(source.match(replaceRegex(replace.match)))
            // TODO Fix fn version
            source = source.replace(replaceRegex(replace.match), <string>replace.replacement)
          }
        }
      }
    }
  } catch (e) {
    console.error(e)
  }
  return source
}
