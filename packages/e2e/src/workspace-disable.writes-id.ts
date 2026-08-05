import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'workspace-disable.writes-id'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const workspaceUri = await Workspace.openTmpDir()
  await Extension.disableWorkspace('test.first')
  const expected = `${JSON.stringify({ disabledExtensions: ['test.first'] }, null, 2)}\n`
  await FileSystem.shouldHaveFile(`${workspaceUri}/.lvce/disabled-extensions.json`, expected)
}
