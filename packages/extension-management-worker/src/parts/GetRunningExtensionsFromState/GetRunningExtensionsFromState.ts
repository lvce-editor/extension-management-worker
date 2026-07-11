import type { RuntimeStatus } from '../RuntimeStatus/RuntimeStatus.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'

export const getRunningExtensionsFromState = (
  extensions: readonly any[],
  runtimeStatuses: Readonly<Record<string, RuntimeStatus>>,
): readonly any[] => {
  return extensions
    .flatMap((extension) => {
      const runtimeStatus = runtimeStatuses[extension.id]
      if (!runtimeStatus || runtimeStatus.status !== RuntimeStatusType.Activated) {
        return []
      }
      return [
        {
          ...extension,
          activationEvent: runtimeStatus.activationEvent,
          activationTime: runtimeStatus.activationTime,
        },
      ]
    })
    .toSorted((a, b) => b.activationTime - a.activationTime)
}
