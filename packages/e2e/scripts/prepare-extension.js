import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = join(packageRoot, '.tmp', 'extension')
const serverFixtures = join(packageRoot, 'fixtures', 'failing-native-language-servers', 'extension', 'servers')

const toFileUri = (relativePath) => pathToFileURL(join(packageRoot, relativePath)).href

await rm(join(packageRoot, '.tmp'), { force: true, recursive: true })
await mkdir(outputDirectory, { recursive: true })
await cp(join(packageRoot, 'extension', 'extension.json'), join(outputDirectory, 'extension.json'))
await cp(serverFixtures, join(outputDirectory, 'servers'), { recursive: true })

await build({
  bundle: true,
  define: {
    'globalThis.__TYPESCRIPT_LANGUAGE_SERVER_URI__': JSON.stringify(toFileUri('node_modules/typescript/lib/tsc.js')),
    'globalThis.__VSCODE_CSS_LANGUAGE_SERVER_URI__': JSON.stringify(
      toFileUri('../../node_modules/vscode-langservers-extracted/lib/css-language-server/node/cssServerMain.js'),
    ),
    'globalThis.__VSCODE_HTML_LANGUAGE_SERVER_URI__': JSON.stringify(
      toFileUri('../../node_modules/vscode-langservers-extracted/lib/html-language-server/node/htmlServerMain.js'),
    ),
  },
  entryPoints: [join(packageRoot, 'extension', 'main.js')],
  external: ['electron', 'node:*'],
  format: 'esm',
  outfile: join(outputDirectory, 'main.js'),
  platform: 'browser',
})

const prepareFixtureExtension = async (name) => {
  const sourceDirectory = join(packageRoot, 'fixtures', name)
  const fixtureOutputDirectory = join(packageRoot, '.tmp', name)
  await mkdir(fixtureOutputDirectory, { recursive: true })
  await cp(join(sourceDirectory, 'extension.json'), join(fixtureOutputDirectory, 'extension.json'))
  await build({
    bundle: true,
    entryPoints: [join(sourceDirectory, 'main.js')],
    external: ['electron', 'node:*'],
    format: 'esm',
    outfile: join(fixtureOutputDirectory, 'main.js'),
    platform: 'browser',
  })
}

await Promise.all([prepareFixtureExtension('extension-with-rpc-command-map'), prepareFixtureExtension('extension-no-rpc-command-map')])
