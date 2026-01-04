import * as Assert from '@lvce-editor/assert'
import { VError } from '@lvce-editor/verror'
import * as GetExtensions from '../GetExtensions/GetExtensions.ts'
import * as GetLanguagesFromExtension from '../GetLanguagesFromExtension/GetLanguagesFromExtension.ts'

export const getLanguages = async (platform: number, assetDir: string) => {
  try {
    Assert.number(platform)
    Assert.string(assetDir)
    const extensions = await GetExtensions.getAllExtensions(assetDir, platform)
    const languages = extensions.flatMap((extension: any) => GetLanguagesFromExtension.getLanguagesFromExtension(extension, platform))
    return languages
  } catch (error) {
    throw new VError(error, 'Failed to load languages')
  }
}
