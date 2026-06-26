import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'workspace-enable-extension.command'

export const skip = 1

export const test: Test = async ({ Command, FileSystem, Workspace }) => {
  const workspaceUri = await Workspace.openTmpDir()
  await FileSystem.mkdir(`${workspaceUri}/.lvce`)
  await FileSystem.writeFile(`${workspaceUri}/.lvce/disabled-extensions.json`, '{\n  "disabledExtensions": [\n    "test.extension-enable"\n  ]\n}\n')

  await Command.execute('Extensions.enableWorkspace', 'test.extension-enable')

  await FileSystem.shouldHaveFile(`${workspaceUri}/.lvce/disabled-extensions.json`, '{\n  "disabledExtensions": []\n}\n')
}
