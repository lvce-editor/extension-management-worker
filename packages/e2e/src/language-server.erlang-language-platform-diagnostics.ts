import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'language-server.erlang-language-platform-diagnostics'

const wait = (duration: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

export const test: Test = async ({ Extension, FileSystem, Workspace }) => {
  const extensionUri = import.meta.resolve('../.tmp/erlang-language-platform')
  await Extension.addWebExtension(extensionUri)
  const fixtureUri = import.meta.resolve('../fixtures/erlang-language-platform/workspace')
  const memoryWorkspaceUri = await FileSystem.loadFixture(fixtureUri)
  const workspaceUri = await FileSystem.getTmpDir({ scheme: 'file' })
  await FileSystem.mkdir(`${workspaceUri}/src`)
  for (const relativePath of ['.elp.toml', 'build_info.json', 'src/completion.erl', 'src/diagnostic.erl']) {
    const content = await FileSystem.readFile(`${memoryWorkspaceUri}/${relativePath}`)
    await FileSystem.writeFile(`${workspaceUri}/${relativePath}`, content)
  }
  await Workspace.setPath(workspaceUri)
  const documentUri = `${workspaceUri}/src/diagnostic.erl`
  const source = await FileSystem.readFile(documentUri)
  const diagnosticDocument = {
    languageId: 'erlang-language-platform-diagnostic-driver',
    text: source,
    uri: documentUri,
  }
  let lastDiagnostics: readonly { readonly message?: string }[] = []
  for (let attempt = 0; attempt < 20; attempt++) {
    const diagnosticEdits = await Extension.executeFormattingProvider(diagnosticDocument)
    lastDiagnostics = JSON.parse(diagnosticEdits[0].inserted)
    if (lastDiagnostics.some((diagnostic) => diagnostic.message?.includes("Function 'missing_module:missing_function/0' is undefined"))) {
      break
    }
    await wait(250)
  }
  if (lastDiagnostics.every((diagnostic) => !diagnostic.message?.includes("Function 'missing_module:missing_function/0' is undefined"))) {
    throw new Error(`Expected Erlang Language Platform diagnostics, got ${JSON.stringify(lastDiagnostics)}`)
  }

  const updatedEdits = await Extension.executeFormattingProvider({
    ...diagnosticDocument,
    text: source.replace('missing_module:missing_function()', 'ok'),
  })
  if (updatedEdits[0].inserted !== '[]') {
    throw new Error(`Expected Erlang Language Platform diagnostics to clear, got ${updatedEdits[0].inserted}`)
  }
}
