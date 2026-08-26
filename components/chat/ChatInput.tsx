"use client"

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Send, Image as ImageIcon, Smile, X } from 'lucide-react'
import type { EmojiClickData } from 'emoji-picker-react'
import { generateReactHelpers } from '@uploadthing/react'
import type { OurFileRouter } from '@/lib/uploadthing'

const { useUploadThing } = generateReactHelpers<OurFileRouter>()

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface Props {
  onSend: (content: string, imageUrl?: string | null) => void
  onTypingStart?: () => void
  onTypingStop?: () => void
  disabled?: boolean
}

export function ChatInput({ onSend, onTypingStart, onTypingStop, disabled }: Props) {
  const [value, setValue] = useState('')
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isTypingRef = useRef(false)
  const typingStopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { startUpload, isUploading } = useUploadThing('chatImage', {
    onClientUploadComplete: res => {
      if (res?.[0]) setPendingImage(res[0].url)
    },
    onUploadError: err => setUploadError(err.message),
  })

  useEffect(() => {
    return () => {
      if (typingStopTimeout.current) clearTimeout(typingStopTimeout.current)
      if (isTypingRef.current) onTypingStop?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopTyping() {
    if (typingStopTimeout.current) clearTimeout(typingStopTimeout.current)
    if (isTypingRef.current) {
      isTypingRef.current = false
      onTypingStop?.()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)

    if (!isTypingRef.current) {
      isTypingRef.current = true
      onTypingStart?.()
    }
    if (typingStopTimeout.current) clearTimeout(typingStopTimeout.current)
    typingStopTimeout.current = setTimeout(stopTyping, 2000)
  }

  function handleSend() {
    const text = value.trim()
    if (!text && !pendingImage) return
    stopTyping()
    onSend(text, pendingImage)
    setValue('')
    setPendingImage(null)
    ref.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setUploadError(null)
      startUpload([file])
    }
    e.target.value = ''
  }

  function handleEmojiClick(emojiData: EmojiClickData) {
    const el = ref.current
    if (!el) {
      setValue(v => v + emojiData.emoji)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = value.slice(0, start) + emojiData.emoji + value.slice(end)
    setValue(next)
    setShowEmojiPicker(false)
    requestAnimationFrame(() => {
      el.focus()
      const cursor = start + emojiData.emoji.length
      el.setSelectionRange(cursor, cursor)
    })
  }

  return (
    <div className="border-t border-border bg-white">
      {pendingImage && (
        <div className="px-3 pt-3">
          <div className="relative inline-block group">
            <Image src={pendingImage} alt="Pending upload" width={80} height={80} className="w-20 h-20 object-cover rounded border border-border" />
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              aria-label="Remove image"
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
      {uploadError && <p className="px-3 pt-1 text-xs text-red-600">{uploadError}</p>}

      <div className="flex items-end gap-2 p-3 relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          aria-label="Upload image"
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-page disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ImageIcon size={18} />
        </button>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(v => !v)}
            disabled={disabled}
            aria-label="Insert emoji"
            className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-page disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Smile size={18} />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-11 left-0 z-10">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>

        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowEmojiPicker(false)}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-brand-600 max-h-28 overflow-y-auto disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!value.trim() && !pendingImage)}
          aria-label="Send"
          className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
