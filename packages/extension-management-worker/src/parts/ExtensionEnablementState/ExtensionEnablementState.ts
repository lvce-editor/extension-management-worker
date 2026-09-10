export const DisabledGlobally = 1
export const DisabledWorkspace = 2
export const EnabledGlobally = 3
export const EnabledWorkspace = 4

export type ExtensionEnablementState = typeof DisabledGlobally | typeof DisabledWorkspace | typeof EnabledGlobally | typeof EnabledWorkspace
