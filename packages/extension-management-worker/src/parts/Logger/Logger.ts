/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
export const info = (...args: any[]) => {
  // eslint-disable-next-line no-console
  console.info(...args)
}

export const warn = (...args: string[]) => {
  console.warn(...args)
}

export const error = (...args: any[]) => {
  console.error(...args)
}
