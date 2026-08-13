import * as Assert from '@lvce-editor/assert'
import type { Notification } from '../Notification/Notification.ts'
import * as NotificationState from '../NotificationState/NotificationState.ts'
import { notifyNotificationsChanged } from '../NotifyNotificationsChanged/NotifyNotificationsChanged.ts'
import * as Preferences from '../Preferences/Preferences.ts'
import * as RendererWorker from '../Rpc/Rpc.ts'

const hiddenExtensionIdsPreference = 'notifications.hiddenExtensionIds'

const getHiddenExtensionIds = async (): Promise<readonly string[]> => {
  const value = await Preferences.getPreference(hiddenExtensionIdsPreference)
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

const assertType: (type: string) => asserts type is Notification['type'] = (type) => {
  if (type !== 'error' && type !== 'info' && type !== 'warning') {
    throw new TypeError(`Invalid notification type: ${type}`)
  }
}

const showPopup = async (type: Notification['type'], message: string): Promise<void> => {
  try {
    await RendererWorker.invoke('Notification.create', type, message)
  } catch {
    // Notification storage must keep working while an older renderer is connected.
  }
}

export const clearNotifications = async (): Promise<void> => {
  NotificationState.clear()
  await notifyNotificationsChanged()
}

export const createNotification = async (extensionId: string, type: string, message: string): Promise<void> => {
  Assert.string(extensionId)
  Assert.string(type)
  Assert.string(message)
  assertType(type)
  const hiddenExtensionIds = await getHiddenExtensionIds()
  if (hiddenExtensionIds.includes(extensionId)) {
    return
  }
  NotificationState.add(extensionId, type, message)
  await Promise.all([notifyNotificationsChanged(), showPopup(type, message)])
}

export const dismissNotification = async (id: number): Promise<void> => {
  Assert.number(id)
  NotificationState.dismiss(id)
  await notifyNotificationsChanged()
}

export const getNotificationCount = (): number => {
  return NotificationState.getAll().length
}

export const getNotifications = (): readonly Notification[] => {
  return NotificationState.getAll()
}

export const hideNotificationsFromExtension = async (extensionId: string): Promise<void> => {
  Assert.string(extensionId)
  const hiddenExtensionIds = await getHiddenExtensionIds()
  if (!hiddenExtensionIds.includes(extensionId)) {
    await Preferences.setPreference(hiddenExtensionIdsPreference, [...hiddenExtensionIds, extensionId])
  }
  NotificationState.removeByExtension(extensionId)
  await notifyNotificationsChanged()
}
