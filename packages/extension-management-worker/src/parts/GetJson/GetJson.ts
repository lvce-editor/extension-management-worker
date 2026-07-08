import { VError } from '@lvce-editor/verror'

const getResponseErrorMessage = (response: Response): string => {
  return response.statusText || String(response.status) || 'Request failed'
}

export const getJson = async (url: string): Promise<any> => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(getResponseErrorMessage(response))
    }
    const json = await response.json()
    return json
  } catch (error) {
    throw new VError(error, `Failed to get json`)
  }
}
