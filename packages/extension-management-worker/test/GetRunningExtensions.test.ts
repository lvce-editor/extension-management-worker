import { expect, test } from '@jest/globals'
import type { RuntimeStatus } from '../src/parts/RuntimeStatus/RuntimeStatus.ts'
import { getRunningExtensionsFromState } from '../src/parts/GetRunningExtensionsFromState/GetRunningExtensionsFromState.ts'
import * as RuntimeStatusType from '../src/parts/RuntimeStatusType/RuntimeStatusType.ts'

const createStatus = (id: string, status: number, activationTime: number, activationEvent = ''): RuntimeStatus => ({
  activationEndTime: 0,
  activationEvent,
  activationStartTime: 0,
  activationTime,
  id,
  importEndTime: 0,
  importStartTime: 0,
  importTime: 0,
  status,
})

test('returns activated extensions ordered by activation time', () => {
  const extensions = [
    { id: 'sample.fast', name: 'Fast extension', version: '1.0.0' },
    { id: 'sample.inactive', name: 'Inactive extension', version: '1.0.0' },
    { id: 'sample.slow', name: 'Slow extension', version: '2.0.0' },
  ]
  const runtimeStatuses = {
    'sample.fast': createStatus('sample.fast', RuntimeStatusType.Activated, 5),
    'sample.inactive': createStatus('sample.inactive', RuntimeStatusType.None, 0),
    'sample.slow': createStatus('sample.slow', RuntimeStatusType.Activated, 25, 'onStartupFinished'),
  }

  expect(getRunningExtensionsFromState(extensions, runtimeStatuses)).toEqual([
    {
      activationEvent: 'onStartupFinished',
      activationTime: 25,
      id: 'sample.slow',
      name: 'Slow extension',
      version: '2.0.0',
    },
    {
      activationEvent: '',
      activationTime: 5,
      id: 'sample.fast',
      name: 'Fast extension',
      version: '1.0.0',
    },
  ])
})

test('returns an empty array when no extensions are running', () => {
  expect(getRunningExtensionsFromState([{ id: 'sample.extension' }], {})).toEqual([])
})
