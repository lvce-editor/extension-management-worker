import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'workspace-disable.creates-config-folder'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const workspaceUri = await Workspace.openTmpDir()
  await Extension.disableWorkspace('test.first')
  await FileSystem.shouldHaveFolder(`${workspaceUri}/.lvce`)
}
