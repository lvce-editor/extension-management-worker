export const sleep = (duration: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<undefined>()
  setTimeout(resolve, duration)
  return promise
}
