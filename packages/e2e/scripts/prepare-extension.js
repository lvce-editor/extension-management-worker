import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = join(packageRoot, '.tmp', 'extension')
const serverFixtures = join(packageRoot, 'fixtures', 'failing-native-language-servers', 'extension', 'servers')

const toFileUri = (relativePath) => pathToFileURL(join(packageRoot, relativePath)).href

await rm(outputDirectory, { force: true, recursive: true })
await mkdir(outputDirectory, { recursive: true })
await cp(join(packageRoot, 'extension', 'extension.json'), join(outputDirectory, 'extension.json'))
await cp(serverFixtures, join(outputDirectory, 'servers'), { recursive: true })

await build({
  bundle: true,
  define: {
    'globalThis.__TYPESCRIPT_LANGUAGE_SERVER_URI__': JSON.stringify(toFileUri('node_modules/typescript/bin/tsc')),
    'globalThis.__VSCODE_CSS_LANGUAGE_SERVER_URI__': JSON.stringify(
      toFileUri('node_modules/vscode-langservers-extracted/bin/vscode-css-language-server'),
    ),
    'globalThis.__VSCODE_HTML_LANGUAGE_SERVER_URI__': JSON.stringify(
      toFileUri('node_modules/vscode-langservers-extracted/bin/vscode-html-language-server'),
    ),
  },
  entryPoints: [join(packageRoot, 'extension', 'main.js')],
  external: ['electron', 'node:*'],
  format: 'esm',
  outfile: join(outputDirectory, 'main.js'),
  platform: 'browser',
})
