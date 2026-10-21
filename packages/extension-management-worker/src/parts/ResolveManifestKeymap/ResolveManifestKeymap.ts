// cspell:words keymap keymaps
interface Binding {
  readonly args?: readonly unknown[]
  readonly command: string
  readonly mode?: string
}

interface Mode {
  readonly bindings: Readonly<Record<string, Binding>>
  readonly captureText?: boolean
}

interface Manifest {
  readonly commands?: readonly { readonly id: string }[]
  readonly disabled?: boolean
  readonly id?: string
  readonly keyMap?: {
    readonly cursorStyle?: 'block' | 'line'
    readonly initialMode: string
    readonly modes: Readonly<Record<string, Mode>>
  }
}

// Resolve against the calling application's extension inventory, never another application.
export const resolveManifestKeymap = (extensions: readonly Manifest[], extensionId: string): NonNullable<Manifest['keyMap']> => {
  const extension = extensions.find((item) => item.id === extensionId && !item.disabled)
  const keymap = extension?.keyMap
  if (!keymap || typeof keymap !== 'object' || !keymap.modes || typeof keymap.modes !== 'object') {
    throw new Error(`Extension ${extensionId} does not contribute a keyMap`)
  }
  const commands = new Set(extension.commands?.map((command) => command.id))
  const modes = Object.fromEntries(
    Object.entries(keymap.modes).map(([name, mode]: readonly [string, Mode]) => {
      const bindings = Object.fromEntries(
        Object.entries(mode.bindings).map(([key, binding]: readonly [string, Binding]) => {
          if (!binding || typeof binding.command !== 'string' || !commands.has(binding.command)) {
            throw new Error(`Keymap binding ${name}.${key} must call a command contributed by ${extensionId}`)
          }
          return [key, { ...binding, args: [binding.command, ...(binding.args || [])], command: 'ExtensionHost.executeCommand' }]
        }),
      )
      return [name, { ...mode, bindings }]
    }),
  )
  return { ...keymap, modes }
}
