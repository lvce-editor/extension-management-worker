import { expect, test } from '@jest/globals'
import { getContentSecurityPolicy } from '../src/parts/GetContentSecurityPolicy/GetContentSecurityPolicy.ts'

const workerUrl = 'http://localhost/extensions/builtin.language-features-nvmrc/dist/extension.js'

test('adds the host security boundary when the manifest has no policy', () => {
  expect(getContentSecurityPolicy(undefined, workerUrl)).toBe(
    `default-src 'none'; script-src 'self'; worker-src 'none'; child-src 'none'; connect-src ws://localhost/websocket/capability http://localhost/extensions/builtin.language-features-nvmrc/dist/;`,
  )
})

test('allows the direct node process endpoint only for node-process declarations', () => {
  expect(getContentSecurityPolicy(undefined, workerUrl, [{ id: 'client', type: 'node-process' }])).toBe(
    `default-src 'none'; script-src 'self'; worker-src 'none'; child-src 'none'; connect-src ws://localhost/websocket/capability http://localhost/extensions/builtin.language-features-nvmrc/dist/ ws://localhost/websocket/extension-node-process;`,
  )
  expect(getContentSecurityPolicy(undefined, workerUrl, [{ id: 'client', type: 'node' }])).not.toContain(`/websocket/extension-node-process`)
})

test('adds explicit external connect origins', () => {
  expect(getContentSecurityPolicy([`default-src 'none'`, `connect-src https://nodejs.org`, `script-src 'self' 'unsafe-eval';`], workerUrl)).toBe(
    `default-src 'none'; script-src 'self' 'unsafe-eval'; worker-src 'none'; child-src 'none'; connect-src ws://localhost/websocket/capability http://localhost/extensions/builtin.language-features-nvmrc/dist/ https://nodejs.org;`,
  )
})

test("translates connect-src 'self' to the extension asset path", () => {
  expect(getContentSecurityPolicy([`connect-src 'self'`], workerUrl)).not.toContain(`connect-src 'self'`)
})

test('uses the application capability endpoint for externally hosted workers', () => {
  expect(getContentSecurityPolicy(undefined, 'https://extensions.example/git/extension.js')).toContain(
    `connect-src ws://localhost/websocket/capability https://extensions.example/git/`,
  )
})

test('uses no network sources for non-http workers', () => {
  expect(getContentSecurityPolicy([`connect-src 'self'`, ''], 'file:///extensions/example/extension.js')).toBe(
    `default-src 'none'; script-src 'self'; worker-src 'none'; child-src 'none'; connect-src 'none';`,
  )
})

test('rejects directives containing newlines', () => {
  expect(() => getContentSecurityPolicy([`connect-src https://example.com\nscript-src 'self'`], workerUrl)).toThrow('cannot contain newlines')
})

test('allows secure scheme sources', () => {
  expect(getContentSecurityPolicy([`connect-src https: wss:`], workerUrl)).toContain('connect-src ws://localhost/websocket/capability')
  expect(getContentSecurityPolicy([`connect-src https: wss:`], workerUrl)).toContain('https: wss:;')
})

test('allows insecure wildcard ports only on loopback hosts', () => {
  expect(getContentSecurityPolicy([`connect-src http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*`], workerUrl)).toContain(
    'http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*;',
  )
})

test.each([
  `connect-src *`,
  `connect-src http:`,
  `connect-src ws:`,
  `connect-src https://example.com:*`,
  `connect-src http://example.com:*`,
  `connect-src ws://localhost/file-system-process`,
  `worker-src 'self'`,
  `default-src 'self'`,
])('rejects unsafe policy %s', (directive) => {
  expect(() => getContentSecurityPolicy([directive], workerUrl)).toThrow()
})
