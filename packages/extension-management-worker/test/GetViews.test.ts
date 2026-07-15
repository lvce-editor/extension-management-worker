import type { DisposableMockRpc } from '@lvce-editor/rpc-registry'
import { afterEach, expect, test } from '@jest/globals'
import { PlatformType } from '@lvce-editor/constants'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { getViews } from '../src/parts/GetViews/GetViews.ts'

const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')

const state: {
  rendererWorker: DisposableMockRpc | undefined
} = {
  rendererWorker: undefined,
}

afterEach(() => {
  state.rendererWorker?.[Symbol.dispose]()
  state.rendererWorker = undefined
  if (originalFetch) {
    Object.defineProperty(globalThis, 'fetch', originalFetch)
  } else {
    delete (globalThis as any).fetch
  }
  if (originalLocation) {
    Object.defineProperty(globalThis, 'location', originalLocation)
  } else {
    delete (globalThis as any).location
  }
})

test('getViews reads contributed views from extension manifests without starting extension workers', async () => {
  const eventListeners = [
    {
      name: 'handleDragStart',
      params: ['handleViewEvent', 'dragstart', 'event.target.name'],
    },
  ]
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: {
      origin: 'https://example.test',
      protocol: 'https:',
    },
  })
  state.rendererWorker = RendererWorker.registerMockRpc({
    'Layout.getAssetDir'() {
      return '/static'
    },
  })
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (url: string): Promise<Response> => {
      expect(url).toBe('/static/config/extensions.json')
      return {
        json: async () => [
          {
            browser: 'missing-extension-main.js',
            id: 'extension-one',
            isolated: true,
            isWeb: true,
            path: '/static/extensions/extension-one',
            views: [
              {
                css: 'media/view.css',
                eventListeners,
                icon: 'symbol-beaker',
                id: 'sample.views.testing',
                iframe: {
                  path: 'view.html',
                },
                kind: 'virtualDom',
                showSideBarHeader: false,
                title: 'Testing',
              },
            ],
          },
        ],
        ok: true,
      } as Response
    },
  })

  await expect(getViews('', PlatformType.Web)).resolves.toEqual([
    {
      css: '/static/extensions/extension-one/media/view.css',
      eventListeners,
      extensionId: 'extension-one',
      icon: 'symbol-beaker',
      id: 'sample.views.testing',
      iframe: {
        credentialless: true,
        csp: '',
        sandbox: ['allow-scripts'],
        src: '/static/extensions/extension-one/view.html',
      },
      kind: 'virtualDom',
      showSideBarHeader: false,
      title: 'Testing',
    },
  ])
})
