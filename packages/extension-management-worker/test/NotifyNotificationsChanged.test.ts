import type { Rpc } from '@lvce-editor/rpc'
import { beforeEach, expect, test } from '@jest/globals'
import * as NotificationCenterWorker from '../src/parts/NotificationCenterWorker/NotificationCenterWorker.ts'
import * as NotificationState from '../src/parts/NotificationState/NotificationState.ts'
import { notifyNotificationsChanged } from '../src/parts/NotifyNotificationsChanged/NotifyNotificationsChanged.ts'
import * as StatusBarWorker from '../src/parts/StatusBarWorker/StatusBarWorker.ts'

const createRpc = (): { readonly invocations: unknown[][]; readonly rpc: Rpc } => {
  const invocations: unknown[][] = []
  const rpc = {
    async invoke(method: string, ...params: readonly unknown[]): Promise<void> {
      invocations.push([method, ...params])
    },
  } as unknown as Rpc
  return { invocations, rpc }
}

beforeEach(() => {
  NotificationState.clear()
})

test('notifies connected view workers through their direct message ports', async () => {
  const notificationCenter = createRpc()
  const statusBar = createRpc()
  NotificationCenterWorker.set(notificationCenter.rpc)
  StatusBarWorker.set(statusBar.rpc)
  NotificationState.add('sample.extension', 'info', 'Build complete')

  await notifyNotificationsChanged()

  expect(notificationCenter.invocations).toEqual([
    ['NotificationCenter.handleNotificationsChanged', [{ extensionId: 'sample.extension', id: 1, message: 'Build complete', type: 'info' }]],
  ])
  expect(statusBar.invocations).toEqual([['StatusBar.handleNotificationCountChanged', 1]])
})
