"use client"

import { useState, useTransition } from "react"
import { updateNotificationPreference } from "@/lib/notifications/actions"

interface Props {
  type: string
  label: string
  initialEnabled: boolean
}

export function NotificationPreferenceToggle({ type, label, initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      const result = await updateNotificationPreference(type, next)
      if (result.error) setEnabled(!next)
    })
  }

  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-text-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        disabled={isPending}
        onClick={handleToggle}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-60 ${
          enabled ? "bg-brand-600" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            enabled ? "translate-x-4" : ""
          }`}
        />
      </button>
    </label>
  )
}
