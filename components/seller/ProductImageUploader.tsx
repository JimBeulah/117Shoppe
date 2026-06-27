"use client"

import { useState } from "react"
import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react"
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

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt={`Image ${i + 1}`}
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
          onUploadBegin={() => setUploading(true)}
          onClientUploadComplete={(res) => {
            setUploading(false)
            onChange([...value, ...res.map((r) => r.url)])
          }}
          onUploadError={(err) => {
            setUploading(false)
            alert(`Upload failed: ${err.message}`)
          }}
          appearance={{
            button: "bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded",
          }}
        />
      )}
      {uploading && <p className="text-sm text-text-secondary">Uploading…</p>}
    </div>
  )
}
