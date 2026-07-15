const headerSeparator = Buffer.from('\r\n\r\n')
let buffer = Buffer.alloc(0)

const send = (message) => {
  const content = JSON.stringify(message)
  process.stdout.write(`Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`)
}

export const startLanguageServer = (handleCompletion) => {
  process.stdin.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])
    while (true) {
      const headerEnd = buffer.indexOf(headerSeparator)
      if (headerEnd === -1) {
        return
      }
      const header = buffer.subarray(0, headerEnd).toString('ascii')
      const match = /Content-Length:\s*(\d+)/i.exec(header)
      if (!match) {
        throw new Error('Missing Content-Length')
      }
      const contentLength = Number(match[1])
      const contentStart = headerEnd + headerSeparator.length
      const contentEnd = contentStart + contentLength
      if (buffer.length < contentEnd) {
        return
      }
      const message = JSON.parse(buffer.subarray(contentStart, contentEnd).toString('utf8'))
      buffer = buffer.subarray(contentEnd)
      if (message.method === 'initialize') {
        send({
          id: message.id,
          jsonrpc: '2.0',
          result: {
            capabilities: {
              completionProvider: {},
              textDocumentSync: 1,
            },
          },
        })
      } else if (message.method === 'textDocument/completion') {
        send({
          id: message.id,
          jsonrpc: '2.0',
          ...handleCompletion(),
        })
      }
    }
  })
}
