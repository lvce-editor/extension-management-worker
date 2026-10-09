import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const __dirname = import.meta.dirname

const root = join(__dirname, '..', '..', '..')

export const getRemoteUrl = (path) => {
  const url = pathToFileURL(path).toString().slice(8)
  return `/remote/${url}`
}

const nodeModulesPath = join(root, 'node_modules')

const workerPath = join(root, '.tmp', 'dist', 'dist', 'extensionManagementWorkerMain.js')

const serverStaticPathCandidates = [
  join(nodeModulesPath, '@lvce-editor', 'static-server', 'static'),
  join(root, 'packages', 'server', 'node_modules', '@lvce-editor', 'static-server', 'static'),
  join(root, 'packages', 'server', 'node_modules', '@lvce-editor', 'server', 'node_modules', '@lvce-editor', 'static-server', 'static'),
]

let serverStaticPath = ''
for (const candidate of serverStaticPathCandidates) {
  try {
    await readdir(candidate)
    serverStaticPath = candidate
    break
  } catch (error) {
    if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'ENOENT') {
      throw error
    }
  }
}

if (!serverStaticPath) {
  throw new Error('static server files not found')
}

const RE_COMMIT_HASH = /^[a-z\d]+$/
const isCommitHash = (dirent) => {
  return dirent.length === 7 && dirent.match(RE_COMMIT_HASH)
}

const dirents = await readdir(serverStaticPath)
const commitHash = dirents.find(isCommitHash) || ''
const rendererWorkerMainPath = join(serverStaticPath, commitHash, 'packages', 'renderer-worker', 'dist', 'rendererWorkerMain.js')
const testWorkerMainPath = join(serverStaticPath, commitHash, 'packages', 'test-worker', 'dist', 'testWorkerMain.js')

const replace = async (path, occurrence, replacement) => {
  const content = await readFile(path, 'utf8')
  if (content.includes(replacement)) {
    return
  }
  if (!content.includes(occurrence)) {
    throw new Error(`Could not find expected extension worker URL in ${path}`)
  }
  await writeFile(path, content.replace(occurrence, replacement))
}

const remoteUrl = getRemoteUrl(workerPath)
await replace(
  rendererWorkerMainPath,
  '`${assetDir}/packages/renderer-worker/node_modules/@lvce-editor/extension-management-worker/dist/extensionManagementWorkerMain.js`',
  `\`${remoteUrl}\``,
)
await replace(
  join(serverStaticPath, 'index.html'),
  `"develop.extensionManagementWorkerPath": "/${commitHash}/packages/extension-management-worker/dist/extensionManagementWorkerMain.js"`,
  `"develop.extensionManagementWorkerPath": "${remoteUrl}"`,
)

const testWorkerContent = await readFile(testWorkerMainPath, 'utf-8')
const extensionObjectStart = testWorkerContent.indexOf('const Extension = {')
const extensionObjectEnd = testWorkerContent.indexOf('\n};', extensionObjectStart)

if (extensionObjectStart === -1 || extensionObjectEnd === -1) {
  throw new Error('test worker extension occurrence not found')
}

const extensionObject = testWorkerContent.slice(extensionObjectStart, extensionObjectEnd + 3)
const activateByEventFunction = testWorkerContent.match(
  /const activateByEvent = async \(event, assetDir, platform\) => \{\n  await (invoke\$\d+)\('Extensions\.activateByEvent'/,
)

if (!extensionObject.includes('activateByEvent') || !activateByEventFunction) {
  throw new Error('test worker activateByEvent export not found')
}

if (!extensionObject.includes('uninstall:')) {
  const extensionReplacement = `const uninstallExtensionForTest = async id => {
  await ${activateByEventFunction[1]}('Extensions.uninstall', id);
};

${extensionObject.slice(0, -3)},
  uninstall: uninstallExtensionForTest
};`
  const newTestWorkerContent =
    testWorkerContent.slice(0, extensionObjectStart) + extensionReplacement + testWorkerContent.slice(extensionObjectEnd + 3)
  await writeFile(testWorkerMainPath, newTestWorkerContent)
}
