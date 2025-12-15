export const create = (): any => {
  return {
    finished: false,
  }
}

export const cancel = (token: any): void => {
  token.finished = true
}

export const isCanceled = (token: any): boolean => {
  return token.finished
}
