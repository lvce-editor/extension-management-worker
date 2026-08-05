import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import extract from 'extract-zip'

const vscodeJavaVersion = '1.55.0-995'
const vscodeJavaUrl = `https://github.com/redhat-developer/vscode-java/releases/download/v1.55.0/vscode-java-${vscodeJavaVersion}.vsix`
const vscodeJavaSha256 = '011639c3ee347b9591895bfc77d8cf28f836c053d0a49ae4a83efe9dc473a603'

/**
 * @param {string} name
 */
const findExecutable = (name) => {
  const command = process.platform === 'win32' ? 'where.exe' : 'which'
  return execFileSync(command, [name], { encoding: 'utf8' }).trim().split(/\r?\n/)[0]
}

/**
 * @param {string} temporaryDirectory
 */
const prepareJavaLanguageServer = async (temporaryDirectory) => {
  const response = await fetch(vscodeJavaUrl)
  if (!response.ok) {
    throw new Error(`Failed to download vscode-java ${vscodeJavaVersion}: ${response.status} ${response.statusText}`)
  }
  const archive = Buffer.from(await response.arrayBuffer())
  const sha256 = createHash('sha256').update(archive).digest('hex')
  if (sha256 !== vscodeJavaSha256) {
    throw new Error(`Unexpected vscode-java ${vscodeJavaVersion} checksum: ${sha256}`)
  }

  const archivePath = join(temporaryDirectory, `vscode-java-${vscodeJavaVersion}.vsix`)
  const extractionPath = join(temporaryDirectory, 'vscode-java')
  await writeFile(archivePath, archive)
  await extract(archivePath, { dir: extractionPath })

  const serverPath = join(extractionPath, 'extension', 'server')
  const plugins = await readdir(join(serverPath, 'plugins'))
  const launcher = plugins.find((name) => name.startsWith('org.eclipse.equinox.launcher_') && name.endsWith('.jar'))
  if (!launcher) {
    throw new Error(`Could not find the Eclipse JDT LS launcher in vscode-java ${vscodeJavaVersion}`)
  }

  const configurationName = process.platform === 'win32' ? 'config_win' : process.platform === 'darwin' ? 'config_mac' : 'config_linux'
  const dataPath = join(temporaryDirectory, 'java-language-server-data')
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

const prepareRustAnalyzer = () => {
  execFileSync('rustup', ['component', 'add', 'rust-analyzer'], { stdio: 'inherit' })
  const rustAnalyzerPath = execFileSync('rustup', ['which', 'rust-analyzer'], { encoding: 'utf8' }).trim()
  return pathToFileURL(rustAnalyzerPath).href
}

/**
 * @param {{ temporaryDirectory: string }} options
 */
export const prepareLanguageServers = async ({ temporaryDirectory }) => {
  await mkdir(temporaryDirectory, { recursive: true })

  const rustAnalyzerUri = prepareRustAnalyzer()
  const javaLanguageServer = await prepareJavaLanguageServer(temporaryDirectory)

  return {
    elmLanguageServerUri: import.meta.resolve('@elm-tooling/elm-language-server/out/node/index.js'),
    javaLanguageServer,
    rustAnalyzerUri,
    typescriptLanguageServerUri: import.meta.resolve('typescript/lib/tsc.js'),
    vscodeCssLanguageServerUri: import.meta.resolve('vscode-langservers-extracted/lib/css-language-server/node/cssServerMain.js'),
    vscodeHtmlLanguageServerUri: import.meta.resolve('vscode-langservers-extracted/lib/html-language-server/node/htmlServerMain.js'),
  }
}
