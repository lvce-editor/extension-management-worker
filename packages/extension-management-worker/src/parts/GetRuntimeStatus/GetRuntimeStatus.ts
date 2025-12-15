import type { RuntimeStatus } from '../RuntimeStatus/RuntimeStatus.ts'
import * as RuntimeStatusState from '../RuntimeStatusState/RuntimeStatusState.ts'
import * as RuntimeStatusType from '../RuntimeStatusType/RuntimeStatusType.ts'

const emptyStatus: RuntimeStatus = {
  activationEndTime: 0,
  activationEvent: '',
  activationStartTime: 0,
  activationTime: 0,
  id: '',
  importEndTime: 0,
  importStartTime: 0,
  importTime: 0,
  status: RuntimeStatusType.None,
}

export const getRuntimeStatus = (extensionId: string): RuntimeStatus => {
  return RuntimeStatusState.get(extensionId) || emptyStatus
}
