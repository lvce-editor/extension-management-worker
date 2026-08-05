import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'workspace-enable.filters-non-string-ids'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const workspaceUri = await Workspace.openTmpDir()
  const fileUri = `${workspaceUri}/.lvce/disabled-extensions.json`
  await FileSystem.mkdir(`${workspaceUri}/.lvce`)
  await FileSystem.writeJson(fileUri, { disabledExtensions: ['test.first', 2, null, 'test.second'] })
  await Extension.enableWorkspace('test.first')
  const expected = `${JSON.stringify({ disabledExtensions: ['test.second'] }, null, 2)}\n`
  await FileSystem.shouldHaveFile(fileUri, expected)
}
