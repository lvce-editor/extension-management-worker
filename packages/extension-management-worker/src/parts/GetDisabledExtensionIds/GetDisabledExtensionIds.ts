/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { ExtensionsState } from '../ExtensionsState/ExtensionsState.ts'
import { getExtensionEnablement } from '../GetExtensionEnablement/GetExtensionEnablement.ts'

export const getDisabledExtensionIds = async (extensionsState: ExtensionsState, platform: number): Promise<readonly string[]> => {
  const { disabledIds } = await getExtensionEnablement(extensionsState, platform)
  return disabledIds
}
