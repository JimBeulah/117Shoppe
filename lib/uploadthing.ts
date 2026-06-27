import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"
import { auth } from "@clerk/nextjs/server"

const f = createUploadthing()

export const ourFileRouter = {
  shopLogo: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const { userId } = await auth()
      if (!userId) throw new UploadThingError("Unauthorized")
      return { userId }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url }
    }),

  shopBanner: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const { userId } = await auth()
      if (!userId) throw new UploadThingError("Unauthorized")
      return { userId }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url }
    }),

  productImages: f({ image: { maxFileSize: "4MB", maxFileCount: 9 } })
    .middleware(async () => {
      const { userId } = await auth()
      if (!userId) throw new UploadThingError("Unauthorized")
      return { userId }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
