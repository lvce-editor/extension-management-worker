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

const serverStaticPath = join(nodeModulesPath, '@lvce-editor', 'static-server', 'static')

const RE_COMMIT_HASH = /^[a-z\d]+$/
const isCommitHash = (dirent) => {
  return dirent.length === 7 && dirent.match(RE_COMMIT_HASH)
}

const dirents = await readdir(serverStaticPath)
const commitHash = dirents.find(isCommitHash) || ''
const rendererWorkerMainPath = join(serverStaticPath, commitHash, 'packages', 'renderer-worker', 'dist', 'rendererWorkerMain.js')
const testWorkerMainPath = join(serverStaticPath, commitHash, 'packages', 'test-worker', 'dist', 'testWorkerMain.js')

const content = await readFile(rendererWorkerMainPath, 'utf-8')

const remoteUrl = getRemoteUrl(workerPath)
if (!content.includes('// const extensionManagementWorkerUrl = ')) {
  const occurrence = `const extensionManagementWorkerUrl = \`\${assetDir}/packages/extension-management-worker/dist/extensionManagementWorkerMain.js\``
  const replacement = `// const extensionManagementWorkerUrl = \`\${assetDir}/packages/extension-management-worker/dist/extensionManagementWorkerMain.js\`
const extensionManagementWorkerUrl = \`${remoteUrl}\``

  const newContent = content.replace(occurrence, replacement)
  await writeFile(rendererWorkerMainPath, newContent)
}

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
