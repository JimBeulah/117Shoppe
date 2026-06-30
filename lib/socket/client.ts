import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket
  if (socket) socket.disconnect()

  socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
    auth: { token },
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
