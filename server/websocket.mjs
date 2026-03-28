import crypto from 'node:crypto'

function buildAcceptValue(key) {
  return crypto
    .createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, 'binary')
    .digest('base64')
}

function encodeFrame(payload) {
  const data = Buffer.from(payload)
  const length = data.length

  if (length < 126) {
    return Buffer.concat([Buffer.from([0x81, length]), data])
  }

  if (length < 65536) {
    const header = Buffer.alloc(4)
    header[0] = 0x81
    header[1] = 126
    header.writeUInt16BE(length, 2)
    return Buffer.concat([header, data])
  }

  const header = Buffer.alloc(10)
  header[0] = 0x81
  header[1] = 127
  header.writeBigUInt64BE(BigInt(length), 2)
  return Buffer.concat([header, data])
}

function decodeFrame(buffer) {
  if (buffer.length < 2) return null

  const firstByte = buffer[0]
  const secondByte = buffer[1]
  const opcode = firstByte & 0x0f
  const masked = (secondByte & 0x80) !== 0
  let length = secondByte & 0x7f
  let offset = 2

  if (length === 126) {
    if (buffer.length < 4) return null
    length = buffer.readUInt16BE(2)
    offset = 4
  } else if (length === 127) {
    if (buffer.length < 10) return null
    length = Number(buffer.readBigUInt64BE(2))
    offset = 10
  }

  const maskLength = masked ? 4 : 0
  if (buffer.length < offset + maskLength + length) return null

  let payload = buffer.subarray(offset + maskLength, offset + maskLength + length)

  if (masked) {
    const mask = buffer.subarray(offset, offset + 4)
    const decoded = Buffer.alloc(length)
    for (let index = 0; index < length; index += 1) {
      decoded[index] = payload[index] ^ mask[index % 4]
    }
    payload = decoded
  }

  return {
    bytes: offset + maskLength + length,
    opcode,
    payload: payload.toString('utf8'),
  }
}

function createSocketClient(socket) {
  const messageListeners = new Set()
  const closeListeners = new Set()
  let buffer = Buffer.alloc(0)
  let closed = false

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])

    while (true) {
      const frame = decodeFrame(buffer)
      if (!frame) break

      buffer = buffer.subarray(frame.bytes)

      if (frame.opcode === 0x8) {
        socket.end()
        return
      }

      if (frame.opcode === 0x9) {
        socket.write(Buffer.from([0x8a, 0x00]))
        continue
      }

      if (frame.opcode === 0x1) {
        for (const listener of messageListeners) {
          listener(frame.payload)
        }
      }
    }
  })

  socket.on('close', () => {
    if (closed) return
    closed = true
    for (const listener of closeListeners) {
      listener()
    }
  })

  socket.on('error', () => {
    socket.destroy()
  })

  return {
    sendJSON(payload) {
      if (closed) return
      socket.write(encodeFrame(JSON.stringify(payload)))
    },
    onMessage(listener) {
      messageListeners.add(listener)
    },
    onClose(listener) {
      closeListeners.add(listener)
    },
    close() {
      if (closed) return
      closed = true
      socket.end()
    },
  }
}

export function attachWebSocketServer(server, options) {
  const pathName = options.path ?? '/ws'
  const onClient = options.onClient

  server.on('upgrade', (request, socket) => {
    if (request.url !== pathName) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
      socket.destroy()
      return
    }

    const upgradeHeader = request.headers.upgrade
    const socketKey = request.headers['sec-websocket-key']

    if (upgradeHeader !== 'websocket' || !socketKey) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
      socket.destroy()
      return
    }

    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${buildAcceptValue(socketKey)}`,
      '\r\n',
    ]

    socket.write(responseHeaders.join('\r\n'))
    onClient(createSocketClient(socket))
  })
}
