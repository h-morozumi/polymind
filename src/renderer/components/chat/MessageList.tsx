import { useEffect, useRef } from 'react'
import type { ChatMessage } from '@renderer/types/chat'
import { MessageBubble } from './MessageBubble'

function TypingIndicator(): React.JSX.Element {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[80%] gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-gray-200">
          AI
        </div>
        <div className="rounded-2xl bg-gray-800 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function MessageList({
  messages,
  isLoading,
}: {
  messages: ChatMessage[]
  isLoading: boolean
}): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isLoading])

  // Keep scrolled to bottom when message content changes (long responses)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6">
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-gray-500">
          <p className="text-lg font-medium">polymind</p>
          <p className="mt-1 text-sm">メッセージを送信して会話を始めましょう</p>
        </div>
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
