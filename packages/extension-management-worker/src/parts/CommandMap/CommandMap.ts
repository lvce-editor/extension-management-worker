import { disableExtension } from '../DisableExtension/DisableExtension.ts'
import { enableExtension } from '../EnableExtension/EnableExtension.ts'
import { installExtension } from '../InstallExtension/InstallExtension.ts'
import { uninstallExtension } from '../UninstallExtension/UninstallExtension.ts'

export const commandMap = {
  'Extensions.disable': disableExtension,
  'Extensions.enable': enableExtension,
  'Extensions.install': installExtension,
  'Extensions.uninstall': uninstallExtension,
}
