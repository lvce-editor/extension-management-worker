interface State {
  webExtensions: any[]
}

const state: State = {
  webExtensions: [],
}

export const push = (extension: any): void => {
  state.webExtensions.push(extension)
}

export const hasUri = (uri: string): boolean => {
  return state.webExtensions.some((extension) => extension.uri === uri)
}

export const get = (): readonly any[] => {
  return state.webExtensions
}

export const clear = (): void => {
  state.webExtensions.length = 0
}
