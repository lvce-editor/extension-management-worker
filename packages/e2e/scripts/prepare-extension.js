import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import extract from 'extract-zip'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = join(packageRoot, '.tmp', 'extension')
const serverFixtures = join(packageRoot, 'fixtures', 'failing-native-language-servers', 'extension', 'servers')

const toFileUri = (relativePath) => pathToFileURL(join(packageRoot, relativePath)).href
const elmLanguageServerUri = toFileUri('../../node_modules/@elm-tooling/elm-language-server/out/node/index.js')
const rustAnalyzerPath = execFileSync('rustup', ['which', 'rust-analyzer'], { encoding: 'utf8' }).trim()
const rustAnalyzerUri = pathToFileURL(rustAnalyzerPath).href
const vscodeJavaVersion = '1.55.0-995'
const vscodeJavaUrl = `https://github.com/redhat-developer/vscode-java/releases/download/v1.55.0/vscode-java-${vscodeJavaVersion}.vsix`
const vscodeJavaSha256 = '011639c3ee347b9591895bfc77d8cf28f836c053d0a49ae4a83efe9dc473a603'

await rm(join(packageRoot, '.tmp'), { force: true, recursive: true })
await mkdir(outputDirectory, { recursive: true })
await cp(join(packageRoot, 'extension', 'extension.json'), join(outputDirectory, 'extension.json'))
await cp(serverFixtures, join(outputDirectory, 'servers'), { recursive: true })

const findExecutable = (name) => {
  const command = process.platform === 'win32' ? 'where.exe' : 'which'
  return execFileSync(command, [name], { encoding: 'utf8' }).trim().split(/\r?\n/)[0]
}

const prepareJavaLanguageServer = async () => {
  const response = await fetch(vscodeJavaUrl)
  if (!response.ok) {
    throw new Error(`Failed to download vscode-java ${vscodeJavaVersion}: ${response.status} ${response.statusText}`)
  }
  const archive = Buffer.from(await response.arrayBuffer())
  const sha256 = createHash('sha256').update(archive).digest('hex')
  if (sha256 !== vscodeJavaSha256) {
    throw new Error(`Unexpected vscode-java ${vscodeJavaVersion} checksum: ${sha256}`)
  }

  const archivePath = join(packageRoot, '.tmp', `vscode-java-${vscodeJavaVersion}.vsix`)
  const extractionPath = join(packageRoot, '.tmp', 'vscode-java')
  await writeFile(archivePath, archive)
  await extract(archivePath, { dir: extractionPath })

  const serverPath = join(extractionPath, 'extension', 'server')
  const plugins = await readdir(join(serverPath, 'plugins'))
  const launcher = plugins.find((name) => name.startsWith('org.eclipse.equinox.launcher_') && name.endsWith('.jar'))
  if (!launcher) {
    throw new Error(`Could not find the Eclipse JDT LS launcher in vscode-java ${vscodeJavaVersion}`)
  }

  const configurationName = process.platform === 'win32' ? 'config_win' : process.platform === 'darwin' ? 'config_mac' : 'config_linux'
  const dataPath = join(packageRoot, '.tmp', 'java-language-server-data')
  await mkdir(dataPath, { recursive: true })

  return {
    argv: [
      '--add-modules=ALL-SYSTEM',
      '--add-opens',
      'java.base/java.util=ALL-UNNAMED',
      '--add-opens',
      'java.base/java.lang=ALL-UNNAMED',
      '--add-opens',
      'java.base/sun.nio.fs=ALL-UNNAMED',
      '-Declipse.application=org.eclipse.jdt.ls.core.id1',
      '-Dosgi.bundles.defaultStartLevel=4',
      '-Declipse.product=org.eclipse.jdt.ls.core.product',
      '-DDetectVMInstallationsJob.disabled=true',
      '-Dfile.encoding=UTF-8',
      '-Xlog:disable',
      '-jar',
      join(serverPath, 'plugins', launcher),
      '-configuration',
      join(serverPath, configurationName),
      '-data',
      dataPath,
    ],
    uri: pathToFileURL(findExecutable(process.platform === 'win32' ? 'java.exe' : 'java')).href,
  }
}

const javaLanguageServer = await prepareJavaLanguageServer()

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
    'globalThis.__ELM_LANGUAGE_SERVER_URI__': JSON.stringify(elmLanguageServerUri),
  }),
  prepareFixtureExtension('extension-with-rpc-command-map'),
  prepareFixtureExtension('extension-no-rpc-command-map'),
  prepareFixtureExtension('java-language-server', {
    'globalThis.__JAVA_LANGUAGE_SERVER_ARGV__': JSON.stringify(javaLanguageServer.argv),
    'globalThis.__JAVA_LANGUAGE_SERVER_URI__': JSON.stringify(javaLanguageServer.uri),
  }),
  prepareFixtureExtension('rust-analyzer-language-server', {
    'globalThis.__RUST_ANALYZER_URI__': JSON.stringify(rustAnalyzerUri),
  }),
])
