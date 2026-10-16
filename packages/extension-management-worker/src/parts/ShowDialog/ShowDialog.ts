import { RendererWorker } from '@lvce-editor/rpc-registry'

export interface ShowDialogOptions {
  readonly closeMessage?: string
  readonly confirmMessage?: string
  readonly message: string
  readonly title: string
  readonly type?: 'error' | 'info' | 'warning'
}

export const showDialog = async (options: ShowDialogOptions): Promise<unknown> => {
  return RendererWorker.invoke('ExtensionHostDialog.showDialog', options)
}
