import { afterEach, beforeEach, expect, jest, test } from '@jest/globals'
import * as LinkedExtensionHotReload from '../src/parts/LinkedExtensionHotReload/LinkedExtensionHotReload.ts'

const restartLinkedExtension = jest.fn(async (_extension: { readonly id: string }, _assetDir: string, _platform: number) => true)

const dependencies = {
  getAllExtensions: jest.fn(async (_assetDir: string, _platform: number) => [{ id: 'sample.extension', linked: true, symlink: '/extension' }]),
  getRuntimeContext: jest.fn(async (_assetDir: string, _platform: number) => ({ assetDir: '/assets', platform: 2 })),
  restartLinkedExtension,
}

beforeEach(() => {
  jest.useFakeTimers()
  LinkedExtensionHotReload.configure([{ path: '/extension', uri: 'file:///extension' }], dependencies)
})

afterEach(() => {
  LinkedExtensionHotReload.reset()
  jest.useRealTimers()
  jest.clearAllMocks()
})

test('handleLinkedExtensionChange - restarts the matching linked extension after a quiet period', async () => {
  LinkedExtensionHotReload.handleLinkedExtensionChange({ uri: 'file:///extension/src/main.ts' })

  await jest.advanceTimersByTimeAsync(1999)
  expect(restartLinkedExtension).not.toHaveBeenCalled()

  await jest.advanceTimersByTimeAsync(1)
  expect(restartLinkedExtension.mock.calls[0]).toEqual([{ id: 'sample.extension', linked: true, symlink: '/extension' }, '/assets', 2])
})

test('handleLinkedExtensionChange - debounces rebuild bursts', async () => {
  LinkedExtensionHotReload.handleLinkedExtensionChange({ uri: 'file:///extension/src/main.ts' })
  await jest.advanceTimersByTimeAsync(1500)
  LinkedExtensionHotReload.handleLinkedExtensionChange({ uri: 'file:///extension/src/view.ts' })
  await jest.advanceTimersByTimeAsync(1999)

  expect(restartLinkedExtension).not.toHaveBeenCalled()

  await jest.advanceTimersByTimeAsync(1)
  expect(restartLinkedExtension).toHaveBeenCalledTimes(1)
})

test('handleLinkedExtensionChange - ignores files outside linked extension roots', async () => {
  LinkedExtensionHotReload.handleLinkedExtensionChange({ uri: 'file:///workspace/src/main.ts' })
  await jest.advanceTimersByTimeAsync(2000)

  expect(restartLinkedExtension).not.toHaveBeenCalled()
})

test('handleLinkedExtensionChange - ignores malformed events', async () => {
  LinkedExtensionHotReload.handleLinkedExtensionChange({})
  await jest.advanceTimersByTimeAsync(2000)

  expect(restartLinkedExtension).not.toHaveBeenCalled()
})

test('handleLinkedExtensionChange - accepts an event for the linked root itself', async () => {
  LinkedExtensionHotReload.handleLinkedExtensionChange({ uri: 'file:///extension' })
  await jest.advanceTimersByTimeAsync(2000)

  expect(restartLinkedExtension).toHaveBeenCalledTimes(1)
})
