import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/data/user'
import { getConversationsForBuyer, toConversationItem } from '@/lib/data/chat'
import { ConversationList } from '@/components/chat/ConversationList'
import type { ConversationItem } from '@/types/chat'

const ChatWindow = dynamic(() =>
  import('@/components/chat/ChatWindow').then((m) => m.ChatWindow)
)

export const metadata: Metadata = { title: 'Messages' }

interface Props {
  searchParams: Promise<{ c?: string }>
}

export default async function ChatPage({ searchParams }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const { c: conversationId } = await searchParams
  const raw = await getConversationsForBuyer(user.id)

  const conversations: ConversationItem[] = raw.map(c =>
    toConversationItem(c, { name: c.shop.name, avatar: c.shop.logo }, user.id)
  )

  const active = conversationId
    ? conversations.find(c => c.id === conversationId)
    : undefined

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-text-primary mb-4">Messages</h1>
      <div className="flex border border-border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
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
