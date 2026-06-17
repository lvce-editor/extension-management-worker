const getExtensionHostSubWorkerUrl = () => {
  return new URL('../../../../extension-host-sub-worker/src/extensionHostSubWorkerMain.js', import.meta.url).href
}

export const extensionHostSubWorkerUrl = getExtensionHostSubWorkerUrl()

// TODO
