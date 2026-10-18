/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import type { Rpc } from '@lvce-editor/rpc'
import { expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { commandMapRef } from '../src/parts/CommandMapRef/CommandMapRef.ts'
import { createWebViewWorkerRpc2 } from '../src/parts/CreateWebViewRpc2/CreateWebViewRpc2.ts'
import { createIsolatedExtensionHostWorker } from '../src/parts/GetOrCreateIsolatedExtensionHostWorker/GetOrCreateIsolatedExtensionHostWorker.ts'

Object.assign(commandMapRef, { 'Extensions.createWebViewWorkerRpc2': createWebViewWorkerRpc2 })

const createHost = async () => {
  const rpc = {
    dispose: async () => {},
    ipc: { execute: undefined as any },
  }
  const managed = await createIsolatedExtensionHostWorker(
    'builtin.git',
    '/extensions/git/main.js',
    'Git',
    '',
    async () => rpc as unknown as Rpc,
    async () => {},
  )
  return { dispose: managed.dispose, ipc: rpc.ipc }
}

const createChild = (host: Awaited<ReturnType<typeof createHost>>) =>
  host.ipc.execute('Extensions.createWebViewWorkerRpc2', { name: 'Git Worker', url: '/extensions/git/worker.js' }, {})

test('repeated Git runtime replacement retires its children', async () => {
  const live = new Set<string>()
  using mockRpc = RendererWorker.registerMockRpc({
    // The old unowned route exposes the regression as an accumulating worker.
    'IpcParent.create'(): void {
      live.add(`unowned-${live.size}`)
    },
    'LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker'(id: string): void {
      live.delete(id)
    },
    'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker'(_port: unknown, id: string): void {
      live.add(id)
    },
  })
  for (let i = 0; i < 4; i++) {
    const host = await createHost()
    await createChild(host)
    expect(live.size).toBe(1)
    expect(mockRpc.invocations.length).toBeGreaterThan(0)
    await host.dispose()
    expect(live.size).toBe(0)
    await expect(createChild(host)).rejects.toThrow('disposed')
  }
})

test('a child launch completing after disposal cannot retire replacement workers', async () => {
  const live = new Set<string>()
  const delayed = Promise.withResolvers<void>()
  let delayedOnce = false
  using mockRpc = RendererWorker.registerMockRpc({
    'LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker'(id: string): void {
      live.delete(id)
    },
    async 'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker'(_port: unknown, id: string): Promise<void> {
      live.add(id)
      if (!delayedOnce) {
        delayedOnce = true
        await delayed.promise
      }
    },
  })
  const old = await createHost()
  const pending = createChild(old)
  // Attach the rejection handler before resolving the delayed launch.
  const rejected = (async () => {
    try {
      await pending
      return undefined
    } catch (error) {
      return error
    }
  })()
  await old.dispose()
  const replacement = await createHost()
  await createChild(replacement)
  expect(live.size).toBe(1)
  const replacementId = [...live][0]
  delayed.resolve()
  expect(await rejected).toEqual(expect.objectContaining({ message: 'Extension worker scope was disposed during launch' }))
  expect([...live]).toEqual([replacementId])
  expect(mockRpc.invocations.length).toBeGreaterThan(0)
  await replacement.dispose()
  expect(live.size).toBe(0)
})

test('a failed child launch is retired and does not poison the next launch', async () => {
  let fail = true
  const retired: string[] = []
  using mockRpc = RendererWorker.registerMockRpc({
    'LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker'(id: string): void {
      retired.push(id)
    },
    'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker'(): void {
      if (fail) throw new Error('launch failed')
    },
  })
  const host = await createHost()
  await expect(createChild(host)).rejects.toThrow('launch failed')
  expect(retired).toHaveLength(1)
  fail = false
  await createChild(host)
  await host.dispose()
  expect(retired).toHaveLength(2)
  expect(new Set(retired).size).toBe(2)
  expect(mockRpc.invocations.length).toBeGreaterThan(0)
})

test('child cleanup continues when one worker cannot be disposed', async () => {
  let count = 0
  using mockRpc = RendererWorker.registerMockRpc({
    'LaunchIsolatedExtensionHostWorker.disposeIsolatedExtensionHostWorker'(): void {
      count++
      if (count === 1) throw new Error('disposal failed')
    },
    'LaunchIsolatedExtensionHostWorker.launchIsolatedExtensionHostWorker'(): void {},
  })
  const host = await createHost()
  await createChild(host)
  await createChild(host)
  await expect(host.dispose()).rejects.toThrow('Failed to dispose extension runtime')
  expect(count).toBe(2)
  expect(mockRpc.invocations.length).toBeGreaterThan(0)
  await expect(createChild(host)).rejects.toThrow('disposed')
})
