import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'workspace-disabled.round-trip'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const workspaceUri = await Workspace.openTmpDir()
  await Extension.disableWorkspace('test.first')
  await Extension.disableWorkspace('test.second')
  await Extension.enableWorkspace('test.first')
  const expected = `${JSON.stringify({ disabledExtensions: ['test.second'] }, null, 2)}\n`
  await FileSystem.shouldHaveFile(`${workspaceUri}/.lvce/disabled-extensions.json`, expected)
}
