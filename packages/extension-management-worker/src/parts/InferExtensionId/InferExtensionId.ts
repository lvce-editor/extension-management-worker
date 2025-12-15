import * as Character from '../Character/Character.ts'

export const interExtensionId = (path: string): string => {
  const slashIndex = path.lastIndexOf(Character.Slash)
  return path.slice(slashIndex + 1)
}
