import type { RuntimeStatus } from '../RuntimeStatus/RuntimeStatus.ts'

const states: Record<string, RuntimeStatus> = Object.create(null)

export const set = (status: RuntimeStatus): void => {
  states[status.id] = status
}

export const get = (extensionId: string): RuntimeStatus | undefined => {
  return states[extensionId]
}

export const update = (id: string, update: Partial<RuntimeStatus>): void => {
  states[id] = {
    ...states[id],
    ...update,
  }
}

export const unset = (id: string): void => {
  delete states[id]
}

export const resetAll = (): void => {
  const keys = Object.keys(states)
  for (const key of keys) {
    unset(key)
  }
}
