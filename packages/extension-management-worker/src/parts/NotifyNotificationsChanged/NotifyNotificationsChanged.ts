import * as NotificationState from '../NotificationState/NotificationState.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

const invokeIfAvailable = async (method: string, ...params: readonly unknown[]): Promise<void> => {
  try {
    await RendererWorker.invoke(method, ...params)
  } catch {
    // The target view is lazy and may not be loaded yet.
  }
}

export const notifyNotificationsChanged = async (): Promise<void> => {
  const notifications = NotificationState.getAll()
  await Promise.all([
    invokeIfAvailable('NotificationCenter.handleNotificationsChanged', notifications),
    invokeIfAvailable('StatusBar.handleNotificationCountChanged', notifications.length),
  ])
}
