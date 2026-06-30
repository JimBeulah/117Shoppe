import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/data/user'
import { getMessages } from '@/lib/data/chat'
import { prisma } from '@/lib/db'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { shop: { select: { ownerId: true } } },
  })

  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isBuyer = conversation.buyerId === user.id
  const isSeller = conversation.shop.ownerId === user.id
  if (!isBuyer && !isSeller)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)

  const messages = await getMessages(id, page)
  return NextResponse.json(messages)
}
