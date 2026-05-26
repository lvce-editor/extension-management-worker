interface State {
  webExtensions: any[]
}

const state: State = {
  webExtensions: [],
}

export const push = (extension: any): void => {
  state.webExtensions.push(extension)
}

export const get = (): readonly any[] => {
  return state.webExtensions
}
