import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/data/user'
import { getShopAccess, canAccess } from '@/lib/seller/access'
import { getConversationsForBuyer, getConversationsForSeller } from '@/lib/data/chat'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')

  if (role === 'seller') {
    const access = await getShopAccess()
    if (!access || !canAccess(access, 'CHAT'))
      return NextResponse.json({ error: 'No shop' }, { status: 400 })
    const conversations = await getConversationsForSeller(access.shop.id)
    return NextResponse.json(conversations)
  }

  const conversations = await getConversationsForBuyer(user.id)
  return NextResponse.json(conversations)
}
