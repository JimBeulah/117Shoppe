import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (socket) return socket

  socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
    auth: { token },
    transports: ['websocket'],
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
