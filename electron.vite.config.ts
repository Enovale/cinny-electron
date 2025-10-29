import { defineConfig, externalizeDepsPlugin, ExternalOptions } from 'electron-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { BuildEnvironmentOptions, DepOptimizationOptions } from 'vite'
import { readdir } from 'fs/promises'
import { join, parse } from 'path'
import { readdirSync } from 'node:fs'

const chunks = ['core', 'types']
// TODO currently this repacks for all bundles that needs them
const exclusions: ExternalOptions = {
  exclude: chunks.map((v) => `@cinny-electron/${v}`)
}

const files = (
  await readdir(join(__dirname, 'src/core-plugins'), {
    withFileTypes: true,
    recursive: true
  })
).filter((v) => v.name.endsWith('.ts') || v.name.endsWith('.tsx'))

const optimizeDeps: DepOptimizationOptions = {}

function buildOpts(dir: string): BuildEnvironmentOptions {
  const input = {
    index: `src/desktop/${dir}/index.ts`
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
    plugins: [externalizeDepsPlugin(exclusions), tsconfigPaths()]
  },
  preload: {
    optimizeDeps: optimizeDeps,
    build: buildOpts('preload'),
    plugins: [externalizeDepsPlugin(exclusions), tsconfigPaths()]
  },
  renderer: {
    root: join(__dirname, 'src/desktop/static'),
    build: {
      rollupOptions: {
        input: getRendererFiles()
      }
    }
  }
})

function getRendererFiles(): Record<string, string> {
  const htmlFiles = readdirSync(join(__dirname, 'src/desktop/static'), {
    withFileTypes: true,
    recursive: true
  }).filter((v) => v.name.endsWith('.html') || v.name.endsWith('.htm'))

  const input = {}
  for (const file of htmlFiles) {
    input[parse(file.name).name] = join(file.parentPath, file.name)
  }

  return input
}
