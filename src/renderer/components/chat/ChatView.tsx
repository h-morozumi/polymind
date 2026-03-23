import { useState, useCallback, useRef, useEffect } from 'react'
import type { ChatMessage } from '@renderer/types/chat'
import type { LlmProvider, ModelSelection } from '@shared/llm'
import type { ChatCompletionMessage, ChatStreamEvent } from '@shared/chat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ProviderSettingsModal } from '../settings/ProviderSettingsModal'

export function ChatView(): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [providers, setProviders] = useState<LlmProvider[]>([])
  const [selectedModel, setSelectedModel] = useState<ModelSelection | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const messageIdRef = useRef(0)

  const loadSettings = useCallback(async (): Promise<void> => {
    const result = await window.api.getLlmSettings()
    if (result.success) {
      setProviders(result.data.providers)
      setSelectedModel(result.data.lastUsedModel)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const nextId = useCallback((): string => {
    return `msg-${++messageIdRef.current}-${Date.now()}`
  }, [])

  const handleModelSelect = useCallback(async (selection: ModelSelection) => {
    setSelectedModel(selection)
    await window.api.setLastUsedModel(selection)
  }, [])

  const handleSaveProvider = useCallback(
    async (provider: LlmProvider) => {
      await window.api.saveLlmProvider(provider)
      await loadSettings()
    },
    [loadSettings],
  )

  const handleDeleteProvider = useCallback(
    async (id: string) => {
      await window.api.deleteLlmProvider(id)
      await loadSettings()
    },
    [loadSettings],
  )

  const handleSend = useCallback(
    async (content: string) => {
      if (!selectedModel) {
        const errorMessage: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          content: 'モデルが選択されていません。設定からプロバイダーとモデルを選択してください。',
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errorMessage])
        return
      }

      const userMessage: ChatMessage = {
        id: nextId(),
        role: 'user',
        content,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      const modelLabel = getModelLabel(providers, selectedModel)
      const assistantId = nextId()

      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        modelId: `${selectedModel.providerId}/${selectedModel.modelId}`,
        modelName: modelLabel ?? undefined,
      }
      setMessages((prev) => [...prev, assistantMessage])

      const cleanupStream = window.api.onChatStream((event: ChatStreamEvent) => {
        if (event.type === 'text-delta') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + event.textDelta } : m,
            ),
          )
        }
      })

      try {
        const history = buildHistory([...messages, userMessage])
        const result = await window.api.sendChat({ messages: history, model: selectedModel })

        if (!result.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: `エラー: ${result.error}` } : m,
            ),
          )
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'エラーが発生しました。もう一度お試しください。' }
              : m,
          ),
        )
      } finally {
        cleanupStream()
        setIsLoading(false)
      }
    },
    [nextId, providers, selectedModel, messages],
  )

  const handleStop = useCallback(async () => {
    await window.api.cancelChat()
  }, [])

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h1 className="text-base font-semibold text-white">polymind</h1>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          aria-label="LLM プロバイダー設定"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </header>
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        disabled={isLoading}
        providers={providers}
        selectedModel={selectedModel}
        onModelSelect={handleModelSelect}
      />

      {showSettings && (
        <ProviderSettingsModal
          providers={providers}
          lastUsedModel={selectedModel}
          onSaveProvider={handleSaveProvider}
          onDeleteProvider={handleDeleteProvider}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

function getModelLabel(providers: LlmProvider[], selection: ModelSelection | null): string | null {
  if (!selection) return null
  const provider = providers.find((p) => p.id === selection.providerId)
  if (!provider) return null
  const model = provider.models.find((m) => m.id === selection.modelId)
  return model?.name ?? null
}

/** Convert UI messages to LLM completion format */
function buildHistory(messages: ChatMessage[]): ChatCompletionMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .filter((m) => m.content.length > 0)
    .map((m) => ({ role: m.role, content: m.content }))
}
