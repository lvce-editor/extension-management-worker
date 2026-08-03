import { expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { createWebViewWorkerRpc2 } from '../src/parts/CreateWebViewRpc2/CreateWebViewRpc2.ts'

test('sets the worker content security policy before launch', async () => {
  using mockRpc = RendererWorker.registerMockRpc({
    'ExtensionHostWorkerContentSecurityPolicy.set'(): void {},
    'IpcParent.create'(): void {},
  })
  const { port1, port2 } = new MessageChannel()

  await createWebViewWorkerRpc2(
    {
      contentSecurityPolicy: [`default-src 'none'`, `script-src 'self' 'unsafe-eval'`],
      name: 'Node.js Sandbox',
      url: 'http://localhost/extensions/prettier/nodejsSandboxWorkerMain.js',
    },
    port1,
  )

  expect(mockRpc.invocations).toEqual([
    [
      'ExtensionHostWorkerContentSecurityPolicy.set',
      '/extensions/prettier/nodejsSandboxWorkerMain.js',
      `default-src 'none'; script-src 'self' 'unsafe-eval'; worker-src 'none'; child-src 'none'; connect-src ws://localhost/websocket/capability http://localhost/extensions/prettier/;`,
    ],
    [
      'IpcParent.create',
      {
        method: 6,
        name: 'Node.js Sandbox',
        port: port1,
        raw: true,
        url: 'http://localhost/extensions/prettier/nodejsSandboxWorkerMain.js',
      },
    ],
  ])

  port2.close()
})

test('launches workers without a content security policy', async () => {
  using mockRpc = RendererWorker.registerMockRpc({
    'IpcParent.create'(): void {},
  })
  const { port1, port2 } = new MessageChannel()

  await createWebViewWorkerRpc2(
    {
      name: 'Git Worker',
      url: '/extensions/git/gitWorkerMain.js',
    },
    port1,
  )

  expect(mockRpc.invocations).toEqual([
    [
      'IpcParent.create',
      {
        method: 6,
        name: 'Git Worker',
        port: port1,
        raw: true,
        url: '/extensions/git/gitWorkerMain.js',
      },
    ],
  ])

  port2.close()
})
