import { beforeEach, expect, test } from '@jest/globals'
import * as NotificationState from '../src/parts/NotificationState/NotificationState.ts'

beforeEach(() => {
  NotificationState.reset()
})

test('stores notifications in insertion order', () => {
  NotificationState.add('sample.one', 'info', 'First')
  NotificationState.add('sample.two', 'warning', 'Second')

  expect(NotificationState.getAll()).toEqual([
    { extensionId: 'sample.one', id: 1, message: 'First', type: 'info' },
    { extensionId: 'sample.two', id: 2, message: 'Second', type: 'warning' },
  ])
})

test('dismisses one notification', () => {
  NotificationState.add('sample.one', 'info', 'First')
  NotificationState.add('sample.two', 'warning', 'Second')

  NotificationState.dismiss(1)

  expect(NotificationState.getAll()).toEqual([{ extensionId: 'sample.two', id: 2, message: 'Second', type: 'warning' }])
})

test('removes notifications from one extension', () => {
  NotificationState.add('sample.one', 'info', 'First')
  NotificationState.add('sample.two', 'warning', 'Second')

  NotificationState.removeByExtension('sample.one')

  expect(NotificationState.getAll()).toEqual([{ extensionId: 'sample.two', id: 2, message: 'Second', type: 'warning' }])
})
