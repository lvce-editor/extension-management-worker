import { PlatformType } from '@lvce-editor/constants'
import * as GetRemoteUrl from '../GetRemoteUrl/GetRemoteUrl.ts'

const builtinStaticPathRegex = /(?:^|\/)static\/([a-f\d]{7,40})\/extensions\/([^/]+)$/i

const getBuiltinTokenizerUrl = (extension: any, tokenizePath: string): string => {
  if (typeof extension.id !== 'string' || !extension.id.startsWith('builtin.') || typeof extension.path !== 'string') {
    return ''
  }
  const match = extension.path.match(builtinStaticPathRegex)
  if (!match || match[2] !== extension.id) {
    return ''
  }
  const [, commitHash, extensionId] = match
  return `/${commitHash}/extensions/${extensionId}/${tokenizePath}`
}

export const getLanguagesFromExtension = (extension: any, platform: number): readonly any[] => {
  // TODO what if extension is null? should not crash process, handle error gracefully
  // TODO what if extension languages is not of type array?
  // TODO what if language is null?
  if (!extension) {
    return []
  }
  if (!extension.languages) {
    return []
  }
  const extensionPath = extension.path
  const getLanguageFromExtension = (language: any) => {
    if (language.tokenize) {
      if (typeof language.tokenize !== 'string') {
        console.warn(`[info] ${language.id}: language.tokenize must be of type string but was of type ${typeof language.tokenize}`)
        return {
          ...language,
          extensionPath,
          tokenize: '',
        }
      }
      const relativePath = `${extensionPath}/${language.tokenize}`
      const builtinTokenizerUrl = getBuiltinTokenizerUrl(extension, language.tokenize)
      const absolutePath = builtinTokenizerUrl || (platform === PlatformType.Web ? relativePath : GetRemoteUrl.getRemoteUrl(relativePath))

      return {
        ...language,
        extensionPath,
        tokenize: absolutePath,
      }
    }
    return language
  }
  return extension.languages.map(getLanguageFromExtension)
}
