import { VError } from '@lvce-editor/verror'

export const getJson = async (url: string): Promise<any> => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const json = await response.json()
    return json
  } catch (error) {
    throw new VError(error, `Failed to get json`)
  }
}
