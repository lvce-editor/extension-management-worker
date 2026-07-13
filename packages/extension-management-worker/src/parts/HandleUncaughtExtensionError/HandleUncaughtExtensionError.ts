import { ErrorWorker } from '@lvce-editor/rpc-registry'

const prefix = '[Extension] Uncaught Error: '

export const handleUncaughtExtensionError = async (error: unknown): Promise<void> => {
  const prettyError = await ErrorWorker.invoke('Errors.prepare', error)
  await ErrorWorker.invoke('Errors.print', prettyError, prefix)
}
