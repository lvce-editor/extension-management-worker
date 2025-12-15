import * as Assert from '@lvce-editor/assert'
import { VError } from '@lvce-editor/verror'
import * as CreateLegacyRpc from '../CreateLegacyRpc/CreateLegacyRpc.ts'
import * as GetOrCreateRpcWithId from '../GetOrCreateRpcWithId/GetOrCreateRpcWithId.ts'

export const createRpc = ({ commandMap, contentSecurityPolicy, execute, id, name, url }: any) => {
  try {
    if (execute && !commandMap) {
      throw new Error(`The rpc execute function is deprecated. Use the commandMap property instead.`)
    }
    commandMap ||= {}
    if (id) {
      Assert.string(id)
      return GetOrCreateRpcWithId.createRpcWithId({ commandMap, execute, id })
    }
    return CreateLegacyRpc.createLegacyRpc({ commandMap, contentSecurityPolicy, execute, name, url })
  } catch (error) {
    throw new VError(error, `Failed to create webworker rpc`)
  }
}
