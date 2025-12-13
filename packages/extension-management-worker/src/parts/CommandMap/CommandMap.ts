import { disableExtension } from '../DisableExtension/DisableExtension.ts'
import { enableExtension } from '../EnableExtension/EnableExtension.ts'
import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { installExtension } from '../InstallExtension/InstallExtension.ts'

export const commandMap = {
  'Extensions.enable': enableExtension,
  'Extensions.disable': disableExtension,
  'Extensions.install': installExtension,
  'Extensions.handleMessagePort': handleMessagePort,
}
