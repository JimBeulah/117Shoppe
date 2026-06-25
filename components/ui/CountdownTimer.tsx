"use client"

import { useEffect, useState } from "react"

function getTimeLeft(endsAt: Date) {
  const diff = Math.max(0, endsAt.getTime() - Date.now())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { h, m, s, expired: diff === 0 }
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function CountdownTimer({ endsAt }: { endsAt: Date }) {
  const [time, setTime] = useState(() => getTimeLeft(endsAt))

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft(endsAt)), 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  if (time.expired) return <span className="text-sm font-medium text-accent-sale">Ended</span>

  return (
    <div className="flex items-center gap-1 text-sm font-mono font-bold">
      {[pad(time.h), pad(time.m), pad(time.s)].map((unit, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="bg-text-primary text-white px-1.5 py-0.5 rounded text-xs">{unit}</span>
          {i < 2 && <span className="text-text-primary">:</span>}
        </span>
      ))}
    </div>
  )
}
