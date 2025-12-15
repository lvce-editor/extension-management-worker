import { VError } from '@lvce-editor/verror'
import * as GetJson from '../GetJson/GetJson.ts'
import * as InferExtensionId from '../InferExtensionId/InferExtensionId.ts'

export const getWebExtensionManifest = async (path: string, manifestPath: string): Promise<any> => {
  try {
    const manifest = await GetJson.getJson(manifestPath)
    return {
      ...manifest,
      path,
      uri: path,
    }
  } catch (error) {
    const id = InferExtensionId.interExtensionId(path)
    throw new VError(error, `Failed to load extension manifest for ${id}`)
  }
}
