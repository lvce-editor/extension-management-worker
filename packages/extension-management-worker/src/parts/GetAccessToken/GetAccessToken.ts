import { AuthWorker } from '@lvce-editor/rpc-registry'

export interface GetAccessTokenOptions {
  readonly refresh?: 'if-needed'
}

export const getAccessToken = (options: GetAccessTokenOptions = {}): Promise<string> => {
  return AuthWorker.invoke('Auth.getAccessToken', options)
}
