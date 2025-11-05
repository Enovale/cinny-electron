import { PluginExports } from '@cinny-electron/types'

export const patches: PluginExports['patches'] = [
  {
    find: /variant:\i===parseInt\(\i,10\)\?"Secondary":"Success"/,
    replace: [
      // Fix scaling issue with Page Zoom textbox
      {
        match:
          /(?<=style:\{width:)(\i)\((\d*?)\)(},variant:\i===parseInt\(\i,10\)\?"Secondary":"Success")/,
        replacement: (_orig, toRem, value, after) => `${toRem}(${parseInt(value) + 5})${after}`
      }
    ]
  }
]
