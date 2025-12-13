import { disableExtension } from '../DisableExtension/DisableExtension.ts'
import { enableExtension } from '../EnableExtension/EnableExtension.ts'
import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { installExtension } from '../InstallExtension/InstallExtension.ts'
import { uninstallExtension } from '../UninstallExtension/UninstallExtension.ts'

export const commandMap = {
  'Extensions.disable': disableExtension,
  'Extensions.enable': enableExtension,
<<<<<<< HEAD
  'Extensions.handleMessagePort': handleMessagePort,
=======
>>>>>>> origin/main
  'Extensions.install': installExtension,
  'Extensions.uninstall': uninstallExtension,
}
