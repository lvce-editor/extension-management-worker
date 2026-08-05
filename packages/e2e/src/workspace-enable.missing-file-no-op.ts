import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'workspace-enable.missing-file-no-op'

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const workspaceUri = await Workspace.openTmpDir()
  await Extension.enableWorkspace('test.first')
  const entries = await FileSystem.readDir(workspaceUri)
  if (entries.length > 0) {
    throw new Error(`Expected empty workspace after no-op enable, got ${JSON.stringify(entries)}`)
  }
}
