import type { RuntimeStatus } from '../RuntimeStatus/RuntimeStatus.ts'
import { getIcon } from '../GetIcon/GetIcon.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'

export const getRunningExtensionsFromState = (
  extensions: readonly any[],
  runtimeStatuses: Readonly<Record<string, RuntimeStatus>>,
  assetDir: string,
  platform: number,
): readonly any[] => {
  return extensions
    .flatMap((extension) => {
      const runtimeStatus = runtimeStatuses[extension.id]
      if (!runtimeStatus || runtimeStatus.status !== RuntimeStatusType.Activated) {
        return []
      }
      const manifestIcon = typeof extension.icon === 'string' ? extension.icon.replace(/^\.\//, '') : undefined
      const icon = getIcon(extension, { icon: manifestIcon }, assetDir, platform)
      return [
        {
          ...extension,
          activationEvent: runtimeStatus.activationEvent,
          activationTime: runtimeStatus.activationTime,
          ...(icon && { icon }),
        },
      ]
    })
    .toSorted((a, b) => b.activationTime - a.activationTime)
}
