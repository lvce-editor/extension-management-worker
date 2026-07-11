import { FileSystemWorker } from '@lvce-editor/rpc-registry'

export const readFile = (uri: string): Promise<string> => {
  return FileSystemWorker.readFile(uri)
}
