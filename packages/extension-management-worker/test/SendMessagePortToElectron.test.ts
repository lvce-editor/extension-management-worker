import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { sendMessagePortToElectron } from '../src/parts/SendMessagePortToElectron/SendMessagePortToElectron.ts'

const state: { rendererWorker: DisposableMockRpc | undefined } = {
  rendererWorker: undefined,
}

afterEach(() => {
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
})

test('forwards the message port and initial command to the renderer worker', async () => {
  const invocations: unknown[] = []
  state.rendererWorker = RendererWorker.registerMockRpc({
    'SendMessagePortToElectron.sendMessagePortToElectron'(port: MessagePort, initialCommand: string): void {
      invocations.push(port, initialCommand)
    },
  })
  const channel = new MessageChannel()

  await sendMessagePortToElectron(channel.port1, 'HandleMessagePort.handleMessagePort')

  expect(invocations).toEqual([channel.port1, 'HandleMessagePort.handleMessagePort'])
  channel.port2.close()
})
