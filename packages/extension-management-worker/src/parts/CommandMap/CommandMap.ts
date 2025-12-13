import { disableExtension } from '../DisableExtension/DisableExtension.ts'
import { enableExtension } from '../EnableExtension/EnableExtension.ts'
import { getExtension } from '../GetExtension/GetExtension.ts'
import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { initialize } from '../Initialize/Initialize.ts'
import { installExtension } from '../InstallExtension/InstallExtension.ts'
import { uninstallExtension } from '../UninstallExtension/UninstallExtension.ts'

export const commandMap = {
  'Extensions.disable': disableExtension,
  'Extensions.enable': enableExtension,
  'Extensions.getExtension': getExtension,
  'Extensions.handleMessagePort': handleMessagePort,
  'Extensions.initialize': initialize,
  'Extensions.install': installExtension,
  'Extensions.uninstall': uninstallExtension,
}
