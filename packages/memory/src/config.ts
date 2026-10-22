import { join } from 'node:path'
import { root } from './root.ts'

// Optional-server dispatch adds about 1.8 KiB of initialized worker code (606,280 -> 608,016 bytes in Linux CI).
export const threshold = 612_000

export const workerPath = join(root, '.tmp/dist/dist/extensionManagementWorkerMain.js')

export const playwrightPath = new URL('../../../node_modules/playwright/index.mjs', import.meta.url).toString()
