"use server"

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/data/user'
import { findOrCreateConversation } from '@/lib/data/chat'
import { prisma } from '@/lib/db'

export async function startConversation(shopId: string): Promise<{ error?: string } | void> {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } })
  if (!shop) return { error: 'Shop not found' }

  const conversation = await findOrCreateConversation(user.id, shopId)
  redirect(`/chat?c=${conversation.id}`)
}
