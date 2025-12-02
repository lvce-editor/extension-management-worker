import { disableExtension } from '../DisableExtension/DisableExtension.ts'
import { enableExtension } from '../EnableExtension/EnableExtension.ts'
import { installExtension } from '../InstallExtension/InstallExtension.ts'
import { uninstallExtension } from '../UninstallExtension/UninstallExtension.ts'

export const commandMap = {
  'Extensions.enable': enableExtension,
  'Extensions.disable': disableExtension,
  'Extensions.install': installExtension,
  'Extensions.uninstall': uninstallExtension,
}
