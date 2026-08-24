export const DisabledGlobally = 'disabledGlobally'
export const DisabledWorkspace = 'disabledWorkspace'
export const EnabledGlobally = 'enabledGlobally'
export const EnabledWorkspace = 'enabledWorkspace'

export type ExtensionEnablementState = typeof DisabledGlobally | typeof DisabledWorkspace | typeof EnabledGlobally | typeof EnabledWorkspace
