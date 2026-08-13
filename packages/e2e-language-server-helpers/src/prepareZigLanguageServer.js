import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import extract from 'extract-zip'

const zigVersion = '0.16.0'
const zlsVersion = '0.16.0'

/** @type {Record<string, { readonly zigArchive: string, readonly zigSha256: string, readonly zlsArchive: string, readonly zlsSha256: string }>} */
const assets = {
  'darwin-arm64': {
    zigArchive: `zig-aarch64-macos-${zigVersion}.tar.xz`,
    zigSha256: 'b23d70deaa879b5c2d486ed3316f7eaa53e84acf6fc9cc747de152450d401489',
    zlsArchive: 'zls-aarch64-macos.tar.xz',
    zlsSha256: 'b93ec549f8558a7e85984a840e9276d274f1059b54ade4254296ef4982958359',
  },
  'linux-x64': {
    zigArchive: `zig-x86_64-linux-${zigVersion}.tar.xz`,
    zigSha256: '70e49664a74374b48b51e6f3fdfbf437f6395d42509050588bd49abe52ba3d00',
    zlsArchive: 'zls-x86_64-linux.tar.xz',
    zlsSha256: 'ded6d562a0b86ee878b1ddf70ffab2797ce3cdca3b02d6077548f9d56dff96b6',
  },
  'win32-x64': {
    zigArchive: `zig-x86_64-windows-${zigVersion}.zip`,
    zigSha256: '68659eb5f1e4eb1437a722f1dd889c5a322c9954607f5edcf337bc3684a75a7e',
    zlsArchive: 'zls-x86_64-windows.zip',
    zlsSha256: '35cbb7163224e8cf92d21099c1b1391f2aba927f25d389f021b13a21d40b96dd',
  },
}

/**
 * @param {string} path
 * @param {string} url
 * @param {string} sha256
 */
const downloadFile = async (path, url, sha256) => {
  try {
    const cached = await readFile(path)
    if (createHash('sha256').update(cached).digest('hex') === sha256) {
      return
    }
  } catch {}

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }
  const content = Buffer.from(await response.arrayBuffer())
  const actualSha256 = createHash('sha256').update(content).digest('hex')
  if (actualSha256 !== sha256) {
    throw new Error(`Unexpected checksum for ${url}: ${actualSha256}`)
  }
  const temporaryPath = `${path}.download-${process.pid}`
  await writeFile(temporaryPath, content)
  await rename(temporaryPath, path)
}

/**
 * @param {string} archivePath
 * @param {string} extractionPath
 */
const extractArchive = async (archivePath, extractionPath) => {
  if (archivePath.endsWith('.zip')) {
    await extract(archivePath, { dir: extractionPath })
    return
  }
  execFileSync('tar', ['-xJf', archivePath, '-C', extractionPath], { stdio: 'inherit' })
}

/**
 * @param {string} temporaryDirectory
 * @param {string} cachedDependenciesDirectory
 */
export const prepareZigLanguageServer = async (temporaryDirectory, cachedDependenciesDirectory) => {
  const platform = `${process.platform}-${process.arch}`
  const asset = assets[platform]
  if (!asset) {
    throw new Error(`ZLS ${zlsVersion} has no e2e fixture binary for ${platform}`)
  }

  const cacheDirectory = join(cachedDependenciesDirectory, 'zig-tools')
  await mkdir(cacheDirectory, { recursive: true })
  const zigArchivePath = join(cacheDirectory, asset.zigArchive)
  const zlsArchivePath = join(cacheDirectory, asset.zlsArchive)
  await Promise.all([
    downloadFile(zigArchivePath, `https://ziglang.org/download/${zigVersion}/${asset.zigArchive}`, asset.zigSha256),
    downloadFile(zlsArchivePath, `https://github.com/zigtools/zls/releases/download/${zlsVersion}/${asset.zlsArchive}`, asset.zlsSha256),
  ])

  const extractionDirectory = join(temporaryDirectory, 'zig-language-server-tools')
  const zigExtractionDirectory = join(extractionDirectory, 'zig')
  const zlsExtractionDirectory = join(extractionDirectory, 'zls')
  await rm(extractionDirectory, { force: true, recursive: true })
  await Promise.all([mkdir(zigExtractionDirectory, { recursive: true }), mkdir(zlsExtractionDirectory, { recursive: true })])
  await Promise.all([extractArchive(zigArchivePath, zigExtractionDirectory), extractArchive(zlsArchivePath, zlsExtractionDirectory)])

  const zigDirectoryName = asset.zigArchive.replace(/\.(?:tar\.xz|zip)$/, '')
  const zigExecutableName = process.platform === 'win32' ? 'zig.exe' : 'zig'
  const zlsExecutableName = process.platform === 'win32' ? 'zls.exe' : 'zls'
  const zigExecutablePath = join(zigExtractionDirectory, zigDirectoryName, zigExecutableName)
  const zlsExecutablePath = join(zlsExtractionDirectory, zlsExecutableName)
  const launcherPath = join(extractionDirectory, 'launch-zls.mjs')
  const launcher = `import { spawn } from 'node:child_process'
import { delimiter, dirname } from 'node:path'

const zls = spawn(${JSON.stringify(zlsExecutablePath)}, process.argv.slice(2), {
  env: {
    ...process.env,
    PATH: dirname(${JSON.stringify(zigExecutablePath)}) + delimiter + (process.env.PATH || ''),
  },
  stdio: 'inherit',
  windowsHide: true,
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => zls.kill(signal))
}

zls.once('error', (error) => {
  console.error(error)
  process.exit(1)
})

zls.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
`
  await writeFile(launcherPath, launcher)
  return pathToFileURL(launcherPath).href
}
