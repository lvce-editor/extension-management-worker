import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'workspace-disable-extension.dedupes'

export const skip = 1

export const test: Test = async ({ Command, FileSystem, Workspace }) => {
  const workspaceUri = await Workspace.openTmpDir()

  await Command.execute('Extensions.disableWorkspace', 'test.extension-enable')
  await Command.execute('Extensions.disableWorkspace', 'test.extension-enable')

  await FileSystem.shouldHaveFile(
    `${workspaceUri}/.lvce/disabled-extensions.json`,
    '{\n  "disabledExtensions": [\n    "test.extension-enable"\n  ]\n}\n',
  )
}
