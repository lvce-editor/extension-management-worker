import * as NotificationCenterWorker from '../NotificationCenterWorker/NotificationCenterWorker.ts'
import * as NotificationState from '../NotificationState/NotificationState.ts'
import * as StatusBarWorker from '../StatusBarWorker/StatusBarWorker.ts'

export const notifyNotificationsChanged = async (): Promise<void> => {
  const notifications = NotificationState.getAll()
  await Promise.all([
    NotificationCenterWorker.invoke('NotificationCenter.handleNotificationsChanged', notifications),
    StatusBarWorker.invoke('StatusBar.handleNotificationCountChanged', notifications.length),
  ])
}
