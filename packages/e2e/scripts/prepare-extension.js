import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareLanguageServers } from 'e2e-language-server-helpers'
import { build } from 'esbuild'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const temporaryDirectory = join(packageRoot, '.tmp')
const outputDirectory = join(temporaryDirectory, 'extension')
const serverFixtures = join(packageRoot, 'fixtures', 'failing-native-language-servers', 'extension', 'servers')

await rm(temporaryDirectory, { force: true, recursive: true })
await mkdir(outputDirectory, { recursive: true })
await cp(join(packageRoot, 'extension', 'extension.json'), join(outputDirectory, 'extension.json'))
await cp(serverFixtures, join(outputDirectory, 'servers'), { recursive: true })

const languageServers = await prepareLanguageServers({ temporaryDirectory })

await build({
  bundle: true,
  define: {
    'globalThis.__TYPESCRIPT_LANGUAGE_SERVER_URI__': JSON.stringify(languageServers.typescriptLanguageServerUri),
    'globalThis.__VSCODE_CSS_LANGUAGE_SERVER_URI__': JSON.stringify(languageServers.vscodeCssLanguageServerUri),
    'globalThis.__VSCODE_HTML_LANGUAGE_SERVER_URI__': JSON.stringify(languageServers.vscodeHtmlLanguageServerUri),
  },
  entryPoints: [join(packageRoot, 'extension', 'main.js')],
  external: ['electron', 'node:*'],
  format: 'esm',
  outfile: join(outputDirectory, 'main.js'),
  platform: 'browser',
})

const prepareFixtureExtension = async (name, define = {}) => {
  const sourceDirectory = join(packageRoot, 'fixtures', name)
  const fixtureOutputDirectory = join(packageRoot, '.tmp', name)
  await mkdir(fixtureOutputDirectory, { recursive: true })
  await cp(join(sourceDirectory, 'extension.json'), join(fixtureOutputDirectory, 'extension.json'))
  await build({
    bundle: true,
    define,
    entryPoints: [join(sourceDirectory, 'main.js')],
    external: ['electron', 'node:*'],
    format: 'esm',
    outfile: join(fixtureOutputDirectory, 'main.js'),
    platform: 'browser',
  })
}

await Promise.all([
  prepareFixtureExtension('elm-native-language-server', {
    'globalThis.__ELM_LANGUAGE_SERVER_URI__': JSON.stringify(languageServers.elmLanguageServerUri),
  }),
  prepareFixtureExtension('erlang-language-platform', {
    'globalThis.__ERLANG_LANGUAGE_PLATFORM_URI__': JSON.stringify(languageServers.erlangLanguagePlatformUri),
  }),
  prepareFixtureExtension('extension-with-rpc-command-map'),
  prepareFixtureExtension('extension-no-rpc-command-map'),
  prepareFixtureExtension('java-language-server', {
    'globalThis.__JAVA_LANGUAGE_SERVER_ARGV__': JSON.stringify(languageServers.javaLanguageServer.argv),
    'globalThis.__JAVA_LANGUAGE_SERVER_URI__': JSON.stringify(languageServers.javaLanguageServer.uri),
  }),
  prepareFixtureExtension('rust-analyzer-language-server', {
    'globalThis.__RUST_ANALYZER_URI__': JSON.stringify(languageServers.rustAnalyzerUri),
  }),
])
