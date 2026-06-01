import * as StatusBarWorker from '../StatusBarWorker/StatusBarWorker.ts'

export const handleChange = async (id: string): Promise<void> => {
  await StatusBarWorker.invoke('StatusBar.handleChange', id)
}
