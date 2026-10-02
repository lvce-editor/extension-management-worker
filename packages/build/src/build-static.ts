import { cp, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { root } from './root.js'

const requireServerWorkspace = createRequire(new URL('../../server/package.json', import.meta.url))
const requireServer = createRequire(requireServerWorkspace.resolve('@lvce-editor/server'))
const sharedProcessPath = requireServer.resolve('@lvce-editor/shared-process')
const sharedProcessUrl = pathToFileURL(sharedProcessPath).toString()
const sharedProcess = await import(sharedProcessUrl)

process.env.PATH_PREFIX = '/extension-management-worker'
const { commitHash } = await sharedProcess.exportStatic({
  root,
  extensionPath: '',
  testPath: 'packages/e2e',
})

const rendererWorkerPath = join(root, 'dist', commitHash, 'packages', 'renderer-worker', 'dist', 'rendererWorkerMain.js')

export const getRemoteUrl = (path: string): string => {
  const url = pathToFileURL(path).toString().slice(8)
  return `/remote/${url}`
}

const content = await readFile(rendererWorkerPath, 'utf8')
const workerPath = join(root, '.tmp/dist/dist/extensionManagementWorkerMain.js')
const remoteUrl = getRemoteUrl(workerPath)

const occurrence = `// const extensionManagementWorkerUrl = \`\${assetDir}/packages/extension-management-worker/dist/extensionManagementWorkerMain.js\`
const extensionManagementWorkerUrl = \`${remoteUrl}\``
const replacement = `const extensionManagementWorkerUrl = \`\${assetDir}/packages/extension-management-worker/dist/extensionManagementWorkerMain.js\``
if (!content.includes(occurrence)) {
  throw new Error('occurrence not found')
}
const newContent = content.replace(occurrence, replacement)
await writeFile(rendererWorkerPath, newContent)

await cp(join(root, 'dist'), join(root, '.tmp', 'static'), { recursive: true })
