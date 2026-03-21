import { useState, useCallback } from 'react'
import type { ChatMessage } from '@renderer/types/chat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

let messageId = 0
function nextId(): string {
  return `msg-${++messageId}-${Date.now()}`
}

export function ChatView(): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: nextId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await window.api.sendChat(content)
      const assistantMessage: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      <header className="flex items-center border-b border-gray-800 px-4 py-3">
        <h1 className="text-base font-semibold text-white">polymind</h1>
      </header>
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  )
}
