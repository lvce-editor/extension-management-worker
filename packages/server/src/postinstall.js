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
const extensionOccurrence = `const activateByEvent = async (event, assetDir, platform) => {
  await invoke$3('Extensions.activateByEvent', event, assetDir, platform);
};

const Extension = {
  activateByEvent,
  addNodeExtension,
  addWebExtension,
  disableWorkspace: disableWorkspace$1,
  enableWorkspace,
  executeCompletionProvider,
  executeFormattingProvider
};`
const extensionReplacement = `const activateByEvent = async (event, assetDir, platform) => {
  await invoke$3('Extensions.activateByEvent', event, assetDir, platform);
};
const uninstallExtensionForTest = async id => {
  await invoke$3('Extensions.uninstall', id);
};

const Extension = {
  activateByEvent,
  addNodeExtension,
  addWebExtension,
  disableWorkspace: disableWorkspace$1,
  enableWorkspace,
  executeCompletionProvider,
  executeFormattingProvider,
  uninstall: uninstallExtensionForTest
};`

if (!testWorkerContent.includes(extensionOccurrence) && !testWorkerContent.includes(extensionReplacement)) {
  throw new Error('test worker extension occurrence not found')
}

if (testWorkerContent.includes(extensionOccurrence)) {
  await writeFile(testWorkerMainPath, testWorkerContent.replace(extensionOccurrence, extensionReplacement))
}
