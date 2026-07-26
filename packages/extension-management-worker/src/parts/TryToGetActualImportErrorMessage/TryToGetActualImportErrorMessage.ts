import * as HttpStatusCode from '../HttpStatusCode/HttpStatusCode.ts'

export const tryToGetActualImportErrorMessage = async (url: string, error: unknown): Promise<string> => {
  let response
  try {
    response = await fetch(url)
  } catch (error) {
    return `Failed to import ${url}: ${error}`
  }
  if (response.ok) {
    return `Failed to import ${url}: ${error}`
  }
  switch (response.status) {
    case HttpStatusCode.NotFound:
      return `Failed to import ${url}: Not found (404)`
    default:
      return `Failed to import ${url}: ${error}`
  }
}
