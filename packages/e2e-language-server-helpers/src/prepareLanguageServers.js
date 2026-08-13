import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import extract from 'extract-zip'
import { prepareZigLanguageServer } from './prepareZigLanguageServer.js'

const vscodeJavaVersion = '1.55.0-995'
const vscodeJavaUrl = `https://github.com/redhat-developer/vscode-java/releases/download/v1.55.0/vscode-java-${vscodeJavaVersion}.vsix`
const vscodeJavaSha256 = '011639c3ee347b9591895bfc77d8cf28f836c053d0a49ae4a83efe9dc473a603'
const erlangLanguagePlatformVersion = '2026-08-10'

/** @type {Record<string, { readonly name: string, readonly sha256: string }>} */
const erlangLanguagePlatformAssets = {
  'darwin-arm64': {
    name: 'elp-macos-aarch64-apple-darwin-otp-27.3.vsix',
    sha256: '823a9ae3b70299585abe8baf5eb3f1e1d12e220288bf600a54c5fe1d1b89d141',
  },
  'darwin-x64': {
    name: 'elp-macos-x86_64-apple-darwin-otp-27.3.vsix',
    sha256: '32cc07c8bc97e7be13d4469c9be9057875d0db3888238aa4cabc89b96d19983b',
  },
  'linux-arm64': {
    name: 'elp-linux-aarch64-unknown-linux-gnu-otp-27.3.vsix',
    sha256: 'c3e723df393f51abae774912e1ed0e11cf59ffa66912377bc89d04bc844c45a0',
  },
  'linux-x64': {
    name: 'elp-linux-x86_64-unknown-linux-gnu-otp-27.3.vsix',
    sha256: 'ed6f31ee25cab60c00c4c6b589747ad19a0fce5a9e4f5198b048e0b7b82048e9',
  },
  'win32-x64': {
    name: 'elp-windows-x86_64-pc-windows-msvc-otp-27.3.vsix',
    sha256: '734874375a3c79ca2145676381677b643cc6d7e289a6b4fa296db5443d9c5653',
  },
}

/**
 * @param {string} packageJsonUri
 * @param {string} relativePath
 */
const resolvePackageFile = (packageJsonUri, relativePath) => {
  return new URL(relativePath, packageJsonUri).href
}

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
const prepareErlangLanguagePlatform = async (temporaryDirectory) => {
  const platform = `${process.platform}-${process.arch}`
  const asset = erlangLanguagePlatformAssets[platform]
  if (!asset) {
    throw new Error(`Erlang Language Platform ${erlangLanguagePlatformVersion} has no fixture binary for ${platform}`)
  }
  const url = `https://github.com/WhatsApp/erlang-language-platform/releases/download/${erlangLanguagePlatformVersion}/${asset.name}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download Erlang Language Platform ${erlangLanguagePlatformVersion}: ${response.status} ${response.statusText}`)
  }
  const archive = Buffer.from(await response.arrayBuffer())
  const sha256 = createHash('sha256').update(archive).digest('hex')
  if (sha256 !== asset.sha256) {
    throw new Error(`Unexpected Erlang Language Platform ${erlangLanguagePlatformVersion} checksum: ${sha256}`)
  }

  const archivePath = join(temporaryDirectory, asset.name)
  const extractionPath = join(temporaryDirectory, 'erlang-language-platform')
  await writeFile(archivePath, archive)
  await extract(archivePath, { dir: extractionPath })

  const executableName = process.platform === 'win32' ? 'elp.exe' : 'elp'
  return pathToFileURL(join(extractionPath, 'extension', 'bin', executableName)).href
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
 * @param {{ cachedDependenciesDirectory: string, temporaryDirectory: string }} options
 */
export const prepareLanguageServers = async ({ cachedDependenciesDirectory, temporaryDirectory }) => {
  await mkdir(temporaryDirectory, { recursive: true })

  const erlangLanguagePlatformUri = await prepareErlangLanguagePlatform(temporaryDirectory)
  const rustAnalyzerUri = prepareRustAnalyzer()
  const javaLanguageServer = await prepareJavaLanguageServer(temporaryDirectory)
  const zigLanguageServerUri = await prepareZigLanguageServer(temporaryDirectory, cachedDependenciesDirectory)

  return {
    elmLanguageServerUri: resolvePackageFile(import.meta.resolve('@elm-tooling/elm-language-server/package.json'), './out/node/index.js'),
    erlangLanguagePlatformUri,
    javaLanguageServer,
    rustAnalyzerUri,
    typescriptLanguageServerUri: resolvePackageFile(import.meta.resolve('typescript/package.json'), './lib/tsc.js'),
    vscodeCssLanguageServerUri: resolvePackageFile(
      import.meta.resolve('vscode-langservers-extracted/package.json'),
      './lib/css-language-server/node/cssServerMain.js',
    ),
    vscodeHtmlLanguageServerUri: resolvePackageFile(
      import.meta.resolve('vscode-langservers-extracted/package.json'),
      './lib/html-language-server/node/htmlServerMain.js',
    ),
    zigLanguageServerUri,
  }
}
