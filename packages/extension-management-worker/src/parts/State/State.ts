/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
export interface State {
  readonly activatedExtensions: Record<string, Promise<void>>
  readonly cachedActivationEvents: Record<string, Promise<void>>
  readonly disabledIds: readonly string[]
  readonly platform: number
}

let state: State = {
  activatedExtensions: Object.create(null),
  cachedActivationEvents: Object.create(null),
  disabledIds: [],
  platform: 0,
}

export const set = (newState: State): void => {
  state = newState
}
export const update = (newState: Partial<State>): void => {
  const fullNewState = { ...state, ...newState }
  state = fullNewState
}

export const get = (): State => {
  return state
}
