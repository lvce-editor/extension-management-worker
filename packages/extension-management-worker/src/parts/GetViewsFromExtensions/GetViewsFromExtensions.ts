const toView = (extension: any, view: any): any => {
  const displayName = view.displayName || view.name || view.title || view.id
  return {
    displayName,
    extensionId: extension.id,
    icon: view.icon || '',
    id: view.id,
    title: displayName,
  }
}

export const getViewsFromExtensions = (extensions: readonly any[]): readonly any[] => {
  const views: any[] = []
  for (const extension of extensions) {
    if (!extension || !Array.isArray(extension.views)) {
      continue
    }
    for (const view of extension.views) {
      if (view && typeof view.id === 'string') {
        views.push(toView(extension, view))
      }
    }
  }
  return views
}
