import * as RendererWorker from '../Rpc/Rpc.ts'

export const handleChange = async (id: string): Promise<void> => {
  await RendererWorker.invoke('StatusBar.handleChange', id)
}
