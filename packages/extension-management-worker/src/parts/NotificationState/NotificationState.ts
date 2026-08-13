import type { Notification } from '../Notification/Notification.ts'

const state: { nextId: number; notifications: readonly Notification[] } = {
  nextId: 1,
  notifications: [],
}

export const add = (extensionId: string, type: Notification['type'], message: string): Notification => {
  const notification: Notification = {
    extensionId,
    id: state.nextId++,
    message,
    type,
  }
  state.notifications = [...state.notifications, notification]
  return notification
}

export const clear = (): void => {
  state.notifications = []
}

export const dismiss = (id: number): void => {
  state.notifications = state.notifications.filter((notification) => notification.id !== id)
}

export const getAll = (): readonly Notification[] => {
  return state.notifications
}

export const removeByExtension = (extensionId: string): void => {
  state.notifications = state.notifications.filter((notification) => notification.extensionId !== extensionId)
}

export const reset = (): void => {
  state.nextId = 1
  state.notifications = []
}
