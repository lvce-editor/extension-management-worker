import { RendererWorker } from '@lvce-editor/rpc-registry'

interface ShowQuickPickOptions {
  readonly items: readonly unknown[]
  readonly placeholder?: string
}

export const showQuickPick = async (options: ShowQuickPickOptions): Promise<unknown> => {
  return RendererWorker.invoke('ExtensionHostQuickPick.showQuickPick', options)
}
