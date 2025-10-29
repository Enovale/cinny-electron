import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { BuildEnvironmentOptions, DepOptimizationOptions } from 'vite'
import { readdir } from 'fs/promises'
import { join, parse } from 'path'

const chunks = ['core', 'types']

const files = (
  await readdir(join(__dirname, 'src/core-plugins'), {
    withFileTypes: true,
    recursive: true
  })
).filter((v) => v.name.endsWith('.ts') || v.name.endsWith('.tsx'))

const optimizeDeps: DepOptimizationOptions = {}

function buildOpts(dir: string): BuildEnvironmentOptions {
  const input = {
    index: `src/${dir}/index.ts`
  }
  if (dir != 'preload') {
    for (const file of files) {
      input['plugins/' + parse(file.name).name] = join(file.parentPath, file.name)
    }
  }

  return {
    rollupOptions: {
      output: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        manualChunks: (id) => {
          console.log(id)
          for (const chunk of chunks) {
            if (id.includes(`/src/${chunk}/`)) {
              return chunk
            }
          }
        }
      },
      input: input
    },
    commonjsOptions: {}
  }
}

export default defineConfig({
  main: {
    optimizeDeps: optimizeDeps,
    build: buildOpts('main'),
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@cinny-electron/types', '@cinny-electron/core']
      }),
      tsconfigPaths()
    ]
  },
  preload: {
    optimizeDeps: optimizeDeps,
    build: buildOpts('preload'),
    plugins: [externalizeDepsPlugin(), tsconfigPaths()]
  }
})
