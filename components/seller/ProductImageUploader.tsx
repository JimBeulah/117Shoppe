"use client"

import { useState } from "react"
import Image from "next/image"
import { generateUploadButton } from "@uploadthing/react"
import type { OurFileRouter } from "@/lib/uploadthing"

const UploadButton = generateUploadButton<OurFileRouter>()

interface Props {
  endpoint: keyof OurFileRouter
  value: string[]
  onChange: (urls: string[]) => void
  maxFiles?: number
  label?: string
}

export default function ProductImageUploader({
  endpoint,
  value,
  onChange,
  maxFiles = 9,
  label = "Upload Images",
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={url} className="relative group">
              <Image
                src={url}
                alt={`Image ${i + 1}`}
                width={80}
                height={80}
                className="w-20 h-20 object-cover rounded border border-border-default"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {value.length < maxFiles && (
        <UploadButton
          endpoint={endpoint}
          onUploadBegin={() => {
            setUploading(true)
            setUploadError(null)
          }}
          onClientUploadComplete={(res) => {
            setUploading(false)
            onChange([...value, ...res.map((r) => r.url)])
          }}
          onUploadError={(err) => {
            setUploading(false)
            setUploadError(err.message)
          }}
          appearance={{
            container: "flex flex-col items-start gap-1",
            button:
              "w-auto h-auto ut-ready:bg-brand-600 ut-uploading:bg-brand-400 ut-readying:bg-brand-400 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors focus-within:ring-2 focus-within:ring-brand-500",
            allowedContent: "text-xs text-text-secondary",
          }}
        />
      )}
      {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
      {uploading && <p className="text-sm text-text-secondary">Uploading…</p>}
    </div>
  )
}
