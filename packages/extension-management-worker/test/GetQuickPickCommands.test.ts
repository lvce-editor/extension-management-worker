import { expect, test } from '@jest/globals'
import * as GetQuickPickCommands from '../src/parts/GetQuickPickCommands/GetQuickPickCommands.ts'

test('returns enabled public commands and validates cache hashes', async () => {
  const extensions = [
    {
      commands: [
        { id: 'sample.visible', label: 'Visible' },
        { id: 'sample.internal', internal: true },
      ],
      disabled: false,
    },
    { commands: [{ id: 'disabled.command' }], disabled: true },
    { commands: [{ id: 'second.visible', label: 'Second' }], disabled: false },
  ]

  const response = await GetQuickPickCommands.createQuickPickCommandResponse(extensions, null)
  expect(response).toMatchObject({
    commands: [
      { id: 'sample.visible', label: 'Visible' },
      { id: 'second.visible', label: 'Second' },
    ],
    matchesCache: false,
  })
  if (!response || Array.isArray(response) || !('hash' in response)) {
    throw new Error('expected a command cache response')
  }
  await expect(GetQuickPickCommands.createQuickPickCommandResponse(extensions, response.hash)).resolves.toEqual({
    hash: response.hash,
    matchesCache: true,
  })
  await expect(GetQuickPickCommands.createQuickPickCommandResponse(extensions, 'f'.repeat(64))).resolves.toMatchObject({
    commands: expect.any(Array),
    matchesCache: false,
  })
})

test('preserves public commands without computing a hash when the cache is disabled', async () => {
  const commands = [{ id: 'legacy.command', label: 'Legacy' }]
  await expect(GetQuickPickCommands.createQuickPickCommandResponse([{ commands, disabled: false }])).resolves.toEqual(commands)
})

test('ignores extensions without commands', async () => {
  await expect(GetQuickPickCommands.createQuickPickCommandResponse([{}, { disabled: true }, { commands: [] }], null)).resolves.toMatchObject({
    commands: [],
    matchesCache: false,
  })
})
