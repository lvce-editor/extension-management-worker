export interface Notification {
  readonly extensionId: string
  readonly id: number
  readonly message: string
  readonly type: 'error' | 'info' | 'warning'
}
