import type { ChatMessage } from '@/types/chat'

interface Props {
  message: ChatMessage
  isOwn: boolean
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message, isOwn }: Props) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
          isOwn
            ? 'bg-brand-600 text-white rounded-br-none'
            : 'bg-white border border-border text-text-primary rounded-bl-none'
        }`}
      >
        <p>{message.content}</p>
        <p className={`text-[10px] mt-0.5 ${isOwn ? 'text-white/70 text-right' : 'text-text-secondary'}`}>
          {formatTime(message.createdAt)}
          {isOwn && <span className="ml-1">{message.isRead ? '✓✓' : '✓'}</span>}
        </p>
      </div>
    </div>
  )
}
