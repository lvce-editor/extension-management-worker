import { RendererWorker } from '@lvce-editor/rpc-registry'

interface ShowQuickInputOptions {
  readonly placeholder?: string
  readonly value?: string
}

export const showQuickInput = async (options: ShowQuickInputOptions = {}): Promise<string | undefined> => {
  return RendererWorker.invoke('ExtensionHostQuickPick.showQuickInput', options)
}
