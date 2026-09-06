import { expect, test } from '@jest/globals'
import { PlainMessagePortRpc, TransferMessagePortRpcParent } from '@lvce-editor/rpc'
import * as CommandMapRef from '../src/parts/CommandMapRef/CommandMapRef.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import { createIsolatedExtensionHostWorker } from '../src/parts/GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'

test('starting two application runtimes does not replace the host RPC command table', async () => {
  const hostCommands = {
    'Extensions.invokeForApplication': (id: string) => id,
    'Host.ping': () => 'host',
  }
  Object.assign(CommandMapRef.commandMapRef, hostCommands)
  const { port1, port2 } = new MessageChannel()
  const host = await PlainMessagePortRpc.create({ commandMap: hostCommands, messagePort: port1 })
  const client = await PlainMessagePortRpc.create({ commandMap: {}, messagePort: port2 })
  const runtimes: Awaited<ReturnType<typeof createIsolatedExtensionHostWorker>>[] = []
  const ports: MessagePort[] = []
  const peers: Awaited<ReturnType<typeof PlainMessagePortRpc.create>>[] = []
  try {
    expect(await client.invoke('Host.ping')).toBe('host')
    for (const id of ['source', 'preview']) {
      ExtensionsState.createApplication(id, 1, [])
      runtimes.push(
        await createIsolatedExtensionHostWorker(
          'sample.extension',
          '/sample/main.js',
          '',
          '',
          TransferMessagePortRpcParent.create,
          async (_method: string, port: MessagePort) => {
            ports.push(port)
          },
          ExtensionsState.get(id),
        ),
      )
      expect(await client.invoke('Host.ping')).toBe('host')
      const peer = await PlainMessagePortRpc.create({ commandMap: {}, messagePort: ports.at(-1)! })
      peers.push(peer)
      expect(await peer.invoke('Host.ping')).toBe(id)
    }
    expect(await peers[0].invoke('Host.ping')).toBe('source')
  } finally {
    await Promise.all([host.dispose(), client.dispose(), ...runtimes.map((rpc) => rpc.dispose()), ...peers.map((rpc) => rpc.dispose())])
    for (const port of ports) port.close()
    for (const id of ['source', 'preview']) ExtensionsState.removeApplication(id)
    for (const key of Object.keys(hostCommands)) delete (CommandMapRef.commandMapRef as Record<string, unknown>)[key]
  }
})
