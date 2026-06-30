"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getSocket } from '@/lib/socket/client'
import type { Socket } from 'socket.io-client'

export function useSocket() {
  const { getToken, isSignedIn } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!isSignedIn) return

    let mounted = true

    async function connect() {
      const token = await getToken()
      if (!token || !mounted) return

      const s = getSocket(token)
      s.on('connect', () => { if (mounted) setConnected(true) })
      s.on('disconnect', () => { if (mounted) setConnected(false) })
      if (mounted) setSocket(s)
    }

    connect()

    return () => { mounted = false }
  }, [isSignedIn, getToken])

  return { socket, connected }
}
