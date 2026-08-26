"use client"

import { useState } from "react"
import Image from "next/image"
import { generateUploadButton } from "@uploadthing/react"
import type { OurFileRouter } from "@/lib/uploadthing"

const UploadButton = generateUploadButton<OurFileRouter>()

interface Props {
  images: string[]
  videos: string[]
  onImagesChange: (urls: string[]) => void
  onVideosChange: (urls: string[]) => void
  maxImages?: number
  maxVideos?: number
}

export function ReviewMediaUploader({
  images,
  videos,
  onImagesChange,
  onVideosChange,
  maxImages = 5,
  maxVideos = 2,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const canUploadMore = images.length < maxImages || videos.length < maxVideos

  return (
    <div className="space-y-3">
      {(images.length > 0 || videos.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={url} className="relative group">
              <Image
                src={url}
                alt={`Photo ${i + 1}`}
                width={80}
                height={80}
                className="w-20 h-20 object-cover rounded border border-border-default"
              />
              <button
                type="button"
                onClick={() => onImagesChange(images.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
          {videos.map((url, i) => (
            <div key={url} className="relative group">
              <video src={url} className="w-20 h-20 object-cover rounded border border-border-default" muted />
              <button
                type="button"
                onClick={() => onVideosChange(videos.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {canUploadMore && (
        <UploadButton
          endpoint="reviewMedia"
          onUploadBegin={() => {
            setUploading(true)
            setUploadError(null)
          }}
          onClientUploadComplete={(res) => {
            setUploading(false)
            const newImages = res.filter((r) => r.type.startsWith("image")).map((r) => r.url)
            const newVideos = res.filter((r) => r.type.startsWith("video")).map((r) => r.url)
            if (newImages.length) onImagesChange([...images, ...newImages])
            if (newVideos.length) onVideosChange([...videos, ...newVideos])
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
