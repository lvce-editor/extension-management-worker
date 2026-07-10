const sourcePathMarker = '/extension-management-worker/src/'

export const getExtensionHostSubWorkerUrl = (currentUrl: string = import.meta.url): string => {
  const relativePath = currentUrl.includes(sourcePathMarker)
    ? '../../../../extension-host-sub-worker/src/extensionHostSubWorkerMain.js'
    : '../../extension-host-sub-worker/dist/extensionHostSubWorkerMain.js'
  return new URL(relativePath, currentUrl).href
}

export const extensionHostSubWorkerUrl = getExtensionHostSubWorkerUrl()

// TODO
