import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'

/**
 * @param {string} archivePath
 * @param {string} extractionPath
 */
export const extractZip = async (archivePath, extractionPath) => {
  await mkdir(extractionPath, { recursive: true })

  if (process.platform === 'win32') {
    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', 'Expand-Archive -LiteralPath $env:ZIP_ARCHIVE -DestinationPath $env:ZIP_DESTINATION -Force'],
      {
        env: {
          ...process.env,
          ZIP_ARCHIVE: archivePath,
          ZIP_DESTINATION: extractionPath,
        },
      },
    )
    return
  }

  execFileSync('unzip', ['-q', archivePath, '-d', extractionPath])
}
