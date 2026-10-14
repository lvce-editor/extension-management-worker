import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import { RendererWorker, type DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { createExtensionCommandMap } from '../src/parts/CreateExtensionCommandMap/CreateExtensionCommandMap.ts'
import * as Watcher from '../src/parts/ExtensionFileWatcher/ExtensionFileWatcher.ts'
import * as ExtensionsState from '../src/parts/ExtensionsState/ExtensionsState.ts'
import * as Rpcs from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

const watch = jest.fn(async (_id: string, _options: unknown): Promise<void> => {})
const close = jest.fn(async (_id: string): Promise<void> => {})
const received = jest.fn(async (..._args: readonly unknown[]) => {})
const state: { mock?: DisposableMockRpc } = {}

beforeEach(() => {
  watch.mockReset()
  close.mockReset()
  received.mockClear()
  state.mock = RendererWorker.registerMockRpc({ 'FileWatcher.disposeExtension': close, 'FileWatcher.watchExtension': watch })
  Rpcs.set('one', { invoke: received } as any)
})
afterEach(async () => {
  close.mockImplementation(async () => {})
  await Watcher.disposeOwner('one')
  await Watcher.disposeOwner('two')
  Rpcs.clear()
  state.mock?.[Symbol.dispose]()
})

test('watch requests bind ownership and include dependency folders by default', async () => {
  const options = { roots: ['file:///workspace'] }
  const one = createExtensionCommandMap('one')
  const two = createExtensionCommandMap('two')
  await one['Extensions.createFileSystemWatcher'](1, options)
  const id = watch.mock.calls[0][0]
  expect(watch).toHaveBeenCalledWith(id, { exclude: [], roots: options.roots })
  const event = { eventName: 'change', uri: 'file:///workspace/node_modules/example/index.d.ts' }
  await Watcher.handleEvent(id, event)
  expect(received).toHaveBeenCalledWith('ExtensionApi.handleFileWatcherEvent', 1, event)
  await two['Extensions.disposeFileSystemWatcher'](1)
  expect(close).not.toHaveBeenCalled()
  await one['Extensions.disposeFileSystemWatcher'](1)
  await Watcher.handleEvent(id, event)
  expect(received).toHaveBeenCalledTimes(1)
  expect(close).toHaveBeenCalledWith(id)
})

test('shutdown during registration cancels setup and drops late events', async () => {
  const { promise, resolve } = Promise.withResolvers<void>()
  watch.mockImplementationOnce(async () => promise)
  const creating = Watcher.create('one', 1, { roots: ['file:///workspace'] })
  // eslint-disable-next-line unicorn/prefer-await -- Observe rejection before canceling the pending registration.
  const rejected = creating.catch((error: unknown) => error)
  const id = watch.mock.calls[0][0]
  await Watcher.disposeOwner('one')
  resolve()
  expect(await rejected).toMatchObject({ message: expect.stringContaining('disposed during registration') })
  await Watcher.handleEvent(id, { eventName: 'change', uri: 'file:///workspace/stale.ts' })
  expect(received).not.toHaveBeenCalled()
})

test('registration failures roll back and permit a new watch', async () => {
  watch.mockRejectedValueOnce(new Error('watch limit reached'))
  await expect(Watcher.create('one', 1, { roots: ['file:///workspace'] })).rejects.toThrow('watch limit reached')
  expect(close).toHaveBeenCalledTimes(1)
  await Watcher.create('one', 1, { exclude: ['.git'], roots: ['file:///workspace'] })
  await expect(Watcher.create('one', 1, { roots: ['file:///workspace'] })).rejects.toThrow('already registered')
})

test('failed disposal disables callbacks and remains retryable', async () => {
  await Watcher.create('one', 1, { roots: ['file:///workspace'] })
  const id = watch.mock.calls[0][0]
  close.mockRejectedValueOnce(new Error('transport failure'))
  await expect(Watcher.dispose('one', 1)).rejects.toThrow('transport failure')
  await Watcher.handleEvent(id, { eventName: 'change', uri: 'file:///workspace/stale.ts' })
  expect(received).not.toHaveBeenCalled()
  await Watcher.dispose('one', 1)
  expect(close).toHaveBeenCalledTimes(2)
})

test.each([
  [0, { roots: ['file:///workspace'] }],
  [1, { roots: [] }],
  [1, { roots: ['memfs:///workspace'] }],
  [1, { roots: [12] }],
  [1, { exclude: 'node_modules', roots: ['file:///workspace'] }],
  [1, { exclude: [12], roots: ['file:///workspace'] }],
])('rejects unsupported roots or malformed requests %#', async (id: number, options: unknown) => {
  await expect(Watcher.create('one', id, options as any)).rejects.toThrow('disk roots')
  expect(watch).not.toHaveBeenCalled()
})

test('application-backed filesystem URIs cannot accidentally watch host disk', async () => {
  ExtensionsState.createApplication('embedded', 1, [])
  const application = ExtensionsState.get('embedded')
  try {
    await expect(Watcher.create('one', 1, { roots: ['file:///workspace'] }, application)).rejects.toThrow('application filesystem providers')
    expect(watch).not.toHaveBeenCalled()
  } finally {
    ExtensionsState.removeApplication('embedded')
  }
})

test('shallow watchers preserve recursive defaults and validate their scope option', async () => {
  await Watcher.create('one', 1, { recursive: false, roots: ['file:///workspace'] })
  expect(watch).toHaveBeenCalledWith(expect.any(String), { depth: 0, exclude: [], roots: ['file:///workspace'] })
  await expect(Watcher.create('one', 2, { recursive: 'false', roots: ['file:///workspace'] } as any)).rejects.toThrow('disk roots')
})

test('child names are forwarded only for shallow watches', async () => {
  await Watcher.create('one', 1, { childNames: ['tsconfig.json'], recursive: false, roots: ['file:///workspace'] })
  expect(watch).toHaveBeenCalledWith(expect.any(String), { childNames: ['tsconfig.json'], depth: 0, exclude: [], roots: ['file:///workspace'] })
  await expect(Watcher.create('one', 2, { childNames: ['tsconfig.json'], roots: ['file:///workspace'] })).rejects.toThrow('disk roots')
  await expect(Watcher.create('one', 3, { childNames: ['../config'], recursive: false, roots: ['file:///workspace'] })).rejects.toThrow('disk roots')
})
