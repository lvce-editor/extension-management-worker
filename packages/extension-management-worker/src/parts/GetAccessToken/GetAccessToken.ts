import { AuthWorker } from '@lvce-editor/rpc-registry'

export const getAccessToken = (): Promise<string> => {
  return AuthWorker.invoke('Auth.getAccessToken')
}
