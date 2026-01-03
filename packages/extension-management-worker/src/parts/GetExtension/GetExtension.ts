import * as GetExtensions from '../GetExtensions/GetExtensions.ts'

export const getExtension = async (id: string, assetDir: string): Promise<any> => {
  const allExtensions = await GetExtensions.getAllExtensions(assetDir)
  for (const extension of allExtensions) {
    if (extension.id === id) {
      return extension
    }
  }
  return undefined
}
