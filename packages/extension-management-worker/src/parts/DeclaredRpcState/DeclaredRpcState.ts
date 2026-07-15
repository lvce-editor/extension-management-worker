export interface DeclaredRpc {
  readonly id: string
  readonly name?: string
  readonly type: string
  readonly url: string
}

export interface ExtensionWithDeclaredRpcs {
  readonly builtin?: boolean
  readonly id: string
  readonly path?: string
  readonly rpc: readonly DeclaredRpc[]
  readonly uri?: string
}

const extensions: Record<string, ExtensionWithDeclaredRpcs | undefined> = Object.create(null)

export const get = (extensionId: string): ExtensionWithDeclaredRpcs | undefined => {
  return extensions[extensionId]
}

export const set = (extension: ExtensionWithDeclaredRpcs): void => {
  extensions[extension.id] = extension
}

export const clear = (): void => {
  for (const id of Object.keys(extensions)) {
    delete extensions[id]
  }
}
