import { RendererWorker } from '@lvce-editor/rpc-registry'

export const getPreference = async (key: string): Promise<unknown> => {
  return RendererWorker.invoke('Preferences.get', key)
}

export const setPreference = async (key: string, value: unknown): Promise<void> => {
  await RendererWorker.invoke('Preferences.update', {
    [key]: value,
  })
}
