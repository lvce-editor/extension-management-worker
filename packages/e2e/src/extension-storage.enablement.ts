import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'extension-storage.enablement'

export const test: Test = async () => {
  const fixtureUrl = import.meta.resolve('../.tmp/storage-persistence.js')
  const fixture = await import(fixtureUrl)
  // Tests execute in the runtime's test-worker, alongside the cache-worker package.
  const workerUrl = new URL('../../cache-worker/cacheWorkerMain.js', globalThis.location.href).href
  await fixture.test(workerUrl)
}
