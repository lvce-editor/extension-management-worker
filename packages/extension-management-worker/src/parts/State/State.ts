export interface State {
  readonly disabledIds: readonly string[]
  readonly platform: number
}

let state: State = {
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
