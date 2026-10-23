import { join } from 'node:path'
import { root } from './root.ts'

// Application language routing and generated tokenizer URLs: Linux CI 608,904 -> 617,296 bytes (+1.38%).
export const threshold = 621_000

export const workerPath = join(root, '.tmp/dist/dist/extensionManagementWorkerMain.js')

export const playwrightPath = new URL('../../../node_modules/playwright/index.mjs', import.meta.url).toString()
