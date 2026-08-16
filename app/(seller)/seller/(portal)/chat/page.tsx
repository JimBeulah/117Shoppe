import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/data/user'
import { getShopAccess, canAccess } from '@/lib/seller/access'
import { getConversationsForSeller, toConversationItem } from '@/lib/data/chat'
import { ConversationList } from '@/components/chat/ConversationList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import type { ConversationItem } from '@/types/chat'

export const metadata: Metadata = { title: 'Messages | Seller Centre' }

interface Props {
  searchParams: Promise<{ c?: string }>
}

export default async function SellerChatPage({ searchParams }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const access = await getShopAccess()
  if (!access) redirect('/seller/onboarding')
  if (!canAccess(access, 'CHAT')) redirect('/seller/dashboard')
  const shop = access.shop

  const { c: conversationId } = await searchParams
  const raw = await getConversationsForSeller(shop.id)

  const conversations: ConversationItem[] = raw.map(c =>
    toConversationItem(c, { name: c.buyer.name, avatar: c.buyer.avatar }, user.id)
  )

  const active = conversationId
    ? conversations.find(c => c.id === conversationId)
    : undefined

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">Messages</h1>
      <div className="flex border border-border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
        <ConversationList
          conversations={conversations}
          activeId={conversationId}
          currentUserId={user.id}
        />
        {active ? (
          <ChatWindow
            conversationId={active.id}
            currentUserId={user.id}
            displayName={active.displayName}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-text-secondary">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  )
}
