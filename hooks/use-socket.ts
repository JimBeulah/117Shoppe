"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSocket, disconnectSocket } from '@/lib/socket/client'
import type { Socket } from 'socket.io-client'

export function useSocket() {
  const { getToken, isSignedIn } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!isSignedIn) {
      disconnectSocket()
      setSocket(null)
      setConnected(false)
      return
    }

    const s = getSocket(() => getToken())

    function handleConnect() { setConnected(true) }
    function handleDisconnect() { setConnected(false) }

    s.on('connect', handleConnect)
    s.on('disconnect', handleDisconnect)
    setSocket(s)
    setConnected(s.connected)

    return () => {
      s.off('connect', handleConnect)
      s.off('disconnect', handleDisconnect)
    }
  }, [isSignedIn, getToken])

  return { socket, connected }
}
