import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { PlainMessagePortRpc, type Rpc } from '@lvce-editor/rpc'
import { RendererWorker, type DisposableMockRpc } from '@lvce-editor/rpc-registry'
import * as Services from '../src/parts/ExtensionApplicationServices/ExtensionApplicationServices.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as HandleRpcInfos from '../src/parts/HandleRpcInfos/HandleRpcInfos.ts'

const peers: Rpc[] = []
const ports: MessagePort[] = []
const state: { renderer?: DisposableMockRpc } = {}
const launch = jest.fn(async (..._args: readonly unknown[]) => {})
const terminate = jest.fn(async (_id: string) => {})

beforeEach(() => {
  launch.mockReset()
  terminate.mockReset()
  ExtensionsState.createApplication('source', 1, [])
  ExtensionsState.createApplication('preview', 1, [])
  state.renderer = RendererWorker.registerMockRpc({
    'Application.execute': async (id: string, command: string) => (command === 'FileSystem.stat' ? { type: 7 } : id),
    'LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker': terminate,
    'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker': launch,
  })
})

afterEach(async () => {
  for (const id of ['source', 'preview']) {
    await Services.dispose(ExtensionsState.get(id))
    ExtensionsState.removeApplication(id)
  }
  await Promise.all(peers.map((rpc) => rpc.dispose()))
  for (const port of ports) port.close()
  peers.length = 0
  ports.length = 0
  state.renderer?.[Symbol.dispose]()
})

test('the same declared RPC id resolves within its application without changing the manifest', () => {
  for (const id of ['source', 'preview']) {
    const application = ExtensionsState.get(id)
    const declaration = { id: 'evaluation', type: 'web-worker', url: 'evaluation.js' }
    HandleRpcInfos.handleRpcInfos({ ...application, path: `/${id}`, rpc: [declaration] }, 1)
    expect(Services.getRpcInfo(application, 'evaluation').url).toBe(`/${id}/evaluation.js`)
    expect(declaration.url).toBe('evaluation.js')
  }
  expect(() => Services.getRpcInfo(ExtensionsState.get('source'), 'missing')).toThrow('Rpc not found')
  expect(() => Services.register({ ...ExtensionsState.get('source'), path: '/source', rpc: [{ type: 'node' }] }, 1)).toThrow(
    'only support web-worker',
  )
})

test('real filesystem ports keep the same URI isolated and reject stale generations', async () => {
  for (const id of ['source', 'preview']) {
    const { port1, port2 } = new MessageChannel()
    ports.push(port1, port2)
    await Services.createFileSystemPort(ExtensionsState.get(id), port1)
    peers.push(await PlainMessagePortRpc.create({ commandMap: {}, messagePort: port2 }))
  }
  expect(await peers[0].invoke('FileSystem.readFile', 'memfs:///same.ts')).toBe('source')
  expect(await peers[1].invoke('FileSystem.readFile', 'memfs:///same.ts')).toBe('preview')
  expect(await peers[0].invoke('FileSystem.stat', 'memfs:///same.ts')).toBe(7)
  await expect(peers[0].invoke('Process.exec', 'anything')).rejects.toThrow('Unsupported application filesystem command')
  const previous = ExtensionsState.get('preview')
  ExtensionsState.removeApplication('preview')
  ExtensionsState.createApplication('preview', 1, [])
  await expect(peers[1].invoke('FileSystem.readFile', 'memfs:///same.ts')).rejects.toThrow('Stale extension application')
  await Services.dispose(previous)
  expect(await peers[0].invoke('FileSystem.readFile', 'memfs:///same.ts')).toBe('source')
})

test('child workers have distinct generation-owned ids and late launches are terminated', async () => {
  const source = ExtensionsState.get('source')
  const preview = ExtensionsState.get('preview')
  const { port1, port2 } = new MessageChannel()
  ports.push(port1, port2)
  await Services.createWorker(source, { name: 'Evaluation', url: '/worker.js' }, port1)
  const gate = Promise.withResolvers<void>()
  launch.mockImplementationOnce(() => gate.promise)
  const pending = Services.createWorker(preview, { url: '/worker.js' }, port2)
  const result = Promise.allSettled([pending])
  const sourceId = String(launch.mock.calls[0][1])
  const previewId = String(launch.mock.calls[1][1])
  expect(sourceId).not.toBe(previewId)
  ExtensionsState.removeApplication('preview')
  ExtensionsState.createApplication('preview', 1, [])
  await Services.dispose(preview)
  expect(terminate).toHaveBeenCalledWith(previewId)
  expect(terminate).not.toHaveBeenCalledWith(sourceId)
  gate.resolve()
  const results = await result
  expect(results[0].status).toBe('rejected')
  await Services.dispose(source)
  expect(terminate).toHaveBeenCalledWith(sourceId)
})

test('reloading one extension disposes only its child workers and declarations', async () => {
  const application = ExtensionsState.get('preview')
  const { port1, port2 } = new MessageChannel()
  ports.push(port1, port2)
  for (const id of ['sample', 'other']) {
    Services.register({ ...application, id, path: '/preview', rpc: [{ id, type: 'web-worker', url: `${id}.js` }] }, 1)
  }
  await Services.createWorker(application, { url: '/sample.js' }, port1, false, 'sample')
  await Services.createWorker(application, { url: '/other.js' }, port2, false, 'other')
  const sampleId = String(launch.mock.calls[0][1])
  const otherId = String(launch.mock.calls[1][1])
  await Services.disposeExtension(application, 'sample')
  expect(terminate).toHaveBeenCalledWith(sampleId)
  expect(terminate).not.toHaveBeenCalledWith(otherId)
  expect(() => Services.getRpcInfo(application, 'sample')).toThrow('Rpc not found')
  expect(Services.getRpcInfo(application, 'other').url).toBe('/preview/other.js')
  await Services.dispose(application)
  expect(terminate).toHaveBeenCalledWith(otherId)
  expect(terminate).toHaveBeenCalledTimes(2)
})

test('a filesystem port opening during extension reload cannot register after disposal', async () => {
  const application = ExtensionsState.get('preview')
  const { port1, port2 } = new MessageChannel()
  ports.push(port1, port2)
  const pending = Services.createFileSystemPort(application, port1, 'sample')
  const result = Promise.allSettled([pending])
  await Services.disposeExtension(application, 'sample')
  const results = await result
  expect(results[0].status).toBe('rejected')
})
