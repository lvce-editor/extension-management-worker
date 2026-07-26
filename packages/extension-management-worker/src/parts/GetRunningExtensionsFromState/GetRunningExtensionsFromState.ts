import type { RuntimeStatus } from '../RuntimeStatus/RuntimeStatus.ts'
import { getIcon } from '../GetIcon/GetIcon.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'

const statusNames: Readonly<Record<number, string>> = {
  [RuntimeStatusType.Activated]: 'running',
  [RuntimeStatusType.Error]: 'error',
  [RuntimeStatusType.Terminated]: 'terminated',
}

export const getRunningExtensionsFromState = (
  extensions: readonly any[],
  runtimeStatuses: Readonly<Record<string, RuntimeStatus>>,
  assetDir: string,
  platform: number,
): readonly any[] => {
  return extensions
    .flatMap((extension) => {
      const runtimeStatus = runtimeStatuses[extension.id]
      const status = runtimeStatus && statusNames[runtimeStatus.status]
      if (!runtimeStatus || !status) {
        return []
      }
      const manifestIcon = typeof extension.icon === 'string' ? extension.icon.replace(/^\.\//, '') : undefined
      const icon = getIcon(extension, { icon: manifestIcon }, assetDir, platform)
      return [
        {
          ...extension,
          activationEvent: runtimeStatus.activationEvent,
          activationTime: runtimeStatus.activationTime,
          error: runtimeStatus.error || '',
          ...(icon && { icon }),
          status,
        },
      ]
    })
    .toSorted((a, b) => b.activationTime - a.activationTime)
}
