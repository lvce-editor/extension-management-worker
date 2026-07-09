import { expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { isExtensionCompatible } from '../src/parts/IsExtensionCompatible/IsExtensionCompatible.ts'

test('isExtensionCompatible excludes incompatible web extensions', () => {
  expect(
    isExtensionCompatible(
      {
        compatibility: {
          web: false,
        },
      },
      PlatformType.Web,
    ),
  ).toBe(false)
})

test('isExtensionCompatible includes extensions without explicit web compatibility', () => {
  expect(isExtensionCompatible({}, PlatformType.Web)).toBe(true)
})

test('isExtensionCompatible preserves electron and remote extensions', () => {
  const extension = {
    compatibility: {
      web: false,
    },
  }

  expect(isExtensionCompatible(extension, PlatformType.Electron)).toBe(true)
  expect(isExtensionCompatible(extension, PlatformType.Remote)).toBe(true)
})
