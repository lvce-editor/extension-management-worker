import { afterEach, expect, test } from '@jest/globals'
import * as GetStatusBarItems from '../src/parts/GetStatusBarItems/GetStatusBarItems.ts'
import * as IsolatedExtensionHostWorkerState from '../src/parts/IsolatedExtensionHostWorkerState/IsolatedExtensionHostWorkerState.ts'

afterEach(() => {
  IsolatedExtensionHostWorkerState.clear()
})

test('getStatusBarItems should collect items from isolated extension workers', async () => {
  IsolatedExtensionHostWorkerState.set('extension-1', {
    invoke: async (method: string) => {
      expect(method).toBe('ExtensionApi.getStatusBarItems')
      return [
        {
          name: 'one',
          text: 'One',
        },
      ]
    },
  } as any)
  IsolatedExtensionHostWorkerState.set('extension-2', {
    invoke: async (method: string) => {
      expect(method).toBe('ExtensionApi.getStatusBarItems')
      return [
        {
          name: 'two',
          text: 'Two',
        },
      ]
    },
  } as any)

  await expect(GetStatusBarItems.getStatusBarItems()).resolves.toEqual([
    {
      name: 'one',
      text: 'One',
    },
    {
      name: 'two',
      text: 'Two',
    },
  ])
})
