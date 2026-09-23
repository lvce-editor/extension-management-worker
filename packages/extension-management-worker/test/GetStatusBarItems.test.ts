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
      extensionId: 'extension-1',
      name: 'one',
      text: 'One',
    },
    {
      extensionId: 'extension-2',
      name: 'two',
      text: 'Two',
    },
  ])
})

test('getStatusBarItemContextMenuItems queries the matching isolated extension worker', async () => {
  IsolatedExtensionHostWorkerState.set('extension-1', {
    invoke: async (method: string, providerId: string) => {
      expect(method).toBe('ExtensionApi.getStatusBarItemContextMenuItems')
      expect(providerId).toBe('git.checkout')
      return [{ args: ['main'], command: 'git.checkout', id: 'switch-main', label: 'Switch to main branch' }]
    },
  } as any)
  IsolatedExtensionHostWorkerState.set('extension-2', {
    invoke: async () => {
      throw new Error('disposed')
    },
  } as any)

  await expect(GetStatusBarItems.getStatusBarItemContextMenuItems('extension-1', 'git.checkout')).resolves.toEqual([
    { args: ['main'], command: 'git.checkout', id: 'switch-main', label: 'Switch to main branch' },
  ])

  IsolatedExtensionHostWorkerState.remove('extension-1')
  await expect(GetStatusBarItems.getStatusBarItemContextMenuItems('extension-1', 'git.checkout')).resolves.toEqual([])
})
