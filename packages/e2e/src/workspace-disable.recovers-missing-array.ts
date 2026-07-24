import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'workspace-disable.recovers-missing-array'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const workspaceUri = await Workspace.openTmpDir()
  const fileUri = `${workspaceUri}/.lvce/disabled-extensions.json`
  await FileSystem.mkdir(`${workspaceUri}/.lvce`)
  await FileSystem.writeJson(fileUri, { other: true })
  await Extension.disableWorkspace('test.first')
  const expected = `${JSON.stringify({ disabledExtensions: ['test.first'] }, null, 2)}\n`
  await FileSystem.shouldHaveFile(fileUri, expected)
}
