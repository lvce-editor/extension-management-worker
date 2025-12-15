import * as HttpHeader from '../HttpHeader/HttpHeader.ts'

export const createResponseFromData = (data: any): Response => {
  const responseString = JSON.stringify(data)
  const response = new Response(responseString, {
    headers: {
      [HttpHeader.ContentLength]: `${responseString.length}`,
      [HttpHeader.ContentType]: 'application/json',
    },
  })
  return response
}
