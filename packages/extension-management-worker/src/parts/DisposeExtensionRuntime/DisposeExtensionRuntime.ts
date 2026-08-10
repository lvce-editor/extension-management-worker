import { SharedProcess } from '@lvce-editor/rpc-registry'
import { disposeIsolatedExtensionHostWorker } from '../DisposeIsolatedExtensionHostWorker/DisposeIsolatedExtensionHostWorker.ts'

const disposeLanguageServers = async (extensionId: string): Promise<void> => {
  try {
    await SharedProcess.invoke('LanguageServer.dispose', extensionId)
  } catch {
    // Older shared processes do not expose per-extension language server disposal.
  }
}

export const disposeExtensionRuntime = async (extensionId: string): Promise<boolean> => {
  await disposeLanguageServers(extensionId)
  return disposeIsolatedExtensionHostWorker(extensionId)
}
