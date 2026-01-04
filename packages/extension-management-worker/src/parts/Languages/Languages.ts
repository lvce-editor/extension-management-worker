import { VError } from '@lvce-editor/verror'
import * as GetExtensions from '../GetExtensions/GetExtensions.ts'
import * as GetLanguagesFromExtension from '../GetLanguagesFromExtension/GetLanguagesFromExtension.ts'

export const getLanguages = async (platform: number, assetDir: string) => {
  try {
    const extensions = await GetExtensions.getAllExtensions(assetDir, platform)
    const languages = extensions.flatMap((extension: any) => GetLanguagesFromExtension.getLanguagesFromExtension(extension, platform))
    return languages
  } catch (error) {
    throw new VError(error, 'Failed to load languages')
  }
}
