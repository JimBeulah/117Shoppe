import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

let socket: Socket | null = null
let tokenGetter: (() => Promise<string | null>) | null = null

// Clerk tokens are short-lived, so auth must be re-fetched on every
// (re)connection attempt rather than baked in once at socket creation.
export function getSocket(getToken: () => Promise<string | null>): Socket {
  tokenGetter = getToken

  if (socket) return socket

  socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
    auth: (cb) => {
      tokenGetter?.().then(token => cb({ token }))
    },
    transports: ['websocket'],
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
  tokenGetter = null
}
