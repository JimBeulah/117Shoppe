import { Webhook } from "svix"
import { headers } from "next/headers"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response("CLERK_WEBHOOK_SECRET not set", { status: 500 })
  }

  const body = await req.text()
  const headerPayload = await headers()

  const wh = new Webhook(webhookSecret)
  let event: WebhookEvent

  try {
    event = wh.verify(body, {
      "svix-id": headerPayload.get("svix-id") ?? "",
      "svix-timestamp": headerPayload.get("svix-timestamp") ?? "",
      "svix-signature": headerPayload.get("svix-signature") ?? "",
    }) as WebhookEvent
  } catch {
    return new Response("Invalid signature", { status: 400 })
  }

  if (event.type === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = event.data
    const email = email_addresses[0]?.email_address ?? ""
    const name =
      [first_name, last_name].filter(Boolean).join(" ") || email

    await prisma.user.create({
      data: {
        clerkId: id,
        email,
        name,
        avatar: image_url ?? null,
        role: "BUYER",
      },
    })

    await (await clerkClient()).users.updateUserMetadata(id, {
      publicMetadata: { role: "BUYER" },
    })
  }

  return new Response("OK", { status: 200 })
}
