import { createLazyRpc } from '@lvce-editor/rpc-registry'

const id = 345

// @ts-ignore
export const { invoke, invokeAndTransfer, setFactory } = createLazyRpc(id)
