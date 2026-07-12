import * as ExtensionsState from '../ExtensionsState/ExtensionsState.ts'
import { invalidateExtensionsCache } from '../InvalidateExtensionsCache/InvalidateExtensionsCache.ts'
import * as StatusBarHandleChange from '../StatusBarHandleChange/StatusBarHandleChange.ts'

const hasStatusBarItems = (extension: any): boolean => {
  return Array.isArray(extension.statusBarItems) && extension.statusBarItems.length > 0
}

export const addExtension = async (extension: any): Promise<any> => {
  ExtensionsState.addExtension(extension)
  ExtensionsState.clearCachedExtensions()
  await invalidateExtensionsCache()
  if (hasStatusBarItems(extension)) {
    await StatusBarHandleChange.handleChange(extension.id || extension.path)
  }
  return extension
}
