import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'workspace-disable.appends-id'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const workspaceUri = await Workspace.openTmpDir()
  const fileUri = `${workspaceUri}/.lvce/disabled-extensions.json`
  await FileSystem.mkdir(`${workspaceUri}/.lvce`)
  await FileSystem.writeJson(fileUri, { disabledExtensions: ['test.first'] })
  await Extension.disableWorkspace('test.second')
  const expected = `${JSON.stringify({ disabledExtensions: ['test.first', 'test.second'] }, null, 2)}\n`
  await FileSystem.shouldHaveFile(fileUri, expected)
}
