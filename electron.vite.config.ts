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

function buildOpts(dir: string, ...inputs: string[]): BuildEnvironmentOptions {
  const input = {
    index: `src/desktop/${dir}/index.ts`,
    ...inputs.reduce((acc, curr) => {
      acc[parse(curr).name] = `src/desktop/${dir}/${curr}`
      return acc
    }, {})
  }
  if (dir != 'preload') {
    for (const file of files) {
      input['plugins/' + parse(file.name).name] = join(file.parentPath, file.name)
    }
  }

  return {
    sourcemap: true,
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
    }
  }
}

export default defineConfig({
  main: {
    publicDir: join(__dirname, 'build'),
    optimizeDeps: optimizeDeps,
    build: buildOpts('main'),
    plugins: [externalizeDepsPlugin(exclusions), tsconfigPaths()]
  },
  preload: {
    optimizeDeps: optimizeDeps,
    build: buildOpts('preload', 'updater.ts'),
    plugins: [externalizeDepsPlugin(exclusions), tsconfigPaths()]
  },
  renderer: {
    root: join(__dirname, 'src/desktop/static'),
    build: {
      sourcemap: true,
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
  console.log(htmlFiles)

  const input = {}
  for (let i = 0; i < htmlFiles.length; i++) {
    const file = htmlFiles[i]
    input[parse(file.name).name + i] = join(file.parentPath, file.name)
  }

  return input
}
