export interface State {
  readonly disabledIds: readonly string[]
}

let state: State = {
  disabledIds: [],
}

export const set = (newState: State): void => {
  state = newState
}
export const get = (): State => {
  return state
}
