/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import * as Assert from '@lvce-editor/assert'
import { VError } from '@lvce-editor/verror'
import type { ExtensionsState as ExtensionState } from '../ExtensionsState/ExtensionsState.ts'
import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { getAllExtensionsWithState } from '../GetAllExtensionsWithState/GetAllExtensionsWithState.ts'
import * as GetLanguagesFromExtension from '../GetLanguagesFromExtension/GetLanguagesFromExtension.ts'

export const getLanguages = async (platform: number, assetDir: string, state: ExtensionState = ExtensionsState.get()) => {
  try {
    Assert.number(platform)
    Assert.string(assetDir)
    const extensions = await getAllExtensionsWithState(state, assetDir, platform)
    const languages = extensions.flatMap((extension: any) => GetLanguagesFromExtension.getLanguagesFromExtension(extension, platform))
    return languages
  } catch (error) {
    throw new VError(error, 'Failed to load languages')
  }
}
