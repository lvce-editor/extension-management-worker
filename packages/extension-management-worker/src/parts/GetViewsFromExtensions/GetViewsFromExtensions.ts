const toView = (extension: any, view: any): any => {
  return {
    extensionId: extension.id,
    icon: view.icon || '',
    id: view.id,
    showSideBarHeader: view.showSideBarHeader !== false,
    title: view.title || view.id,
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
