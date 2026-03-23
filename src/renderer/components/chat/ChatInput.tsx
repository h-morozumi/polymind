import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import type { LlmProvider, LlmProviderType, ModelSelection } from '@shared/llm'
import { PROVIDER_TYPE_META } from '@shared/llm'
import { ModelSelector } from './ModelSelector'

export function ChatInput({
  onSend,
  onStop,
  disabled,
  providers,
  selectedModel,
  onModelSelect,
  webSearchEnabled,
  onWebSearchToggle,
}: {
  onSend: (message: string) => void
  onStop: () => void
  disabled: boolean
  providers: LlmProvider[]
  selectedModel: ModelSelection | null
  onModelSelect: (selection: ModelSelection) => void
  webSearchEnabled: boolean
  onWebSearchToggle: (enabled: boolean) => void
}): React.JSX.Element {
  const [input, setInput] = useState('')
  const inputRef = useRef('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevDisabledRef = useRef(disabled)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (prevDisabledRef.current && !disabled) {
      textareaRef.current?.focus()
    }
    prevDisabledRef.current = disabled
  }, [disabled])

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = inputRef.current.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
    inputRef.current = ''
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
    }
  }, [onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) return
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const selectedProviderType = providers.find((p) => p.id === selectedModel?.providerId)?.type as
    | LlmProviderType
    | undefined

  const supportsWebSearch = selectedProviderType
    ? PROVIDER_TYPE_META[selectedProviderType].supportsNativeWebSearch
    : false

  return (
    <div className="border-t border-gray-800 bg-gray-950 px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            inputRef.current = e.target.value
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力…"
          name="chat-message"
          autoComplete="off"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50"
        />
        {disabled ? (
          <button
            onClick={onStop}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white transition-colors hover:bg-red-500"
            aria-label="停止"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600"
            aria-label="送信"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        )}
      </div>
      <div className="mx-auto mt-2 flex max-w-3xl items-center gap-3">
        <ModelSelector
          providers={providers}
          selectedModel={selectedModel}
          onSelect={onModelSelect}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => onWebSearchToggle(!webSearchEnabled)}
          disabled={disabled || !supportsWebSearch}
          title={
            supportsWebSearch
              ? webSearchEnabled
                ? 'Web検索: オン'
                : 'Web検索: オフ'
              : 'このプロバイダーはWeb検索に対応していません'
          }
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
            webSearchEnabled && supportsWebSearch
              ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
              : 'text-gray-500 hover:bg-gray-800 hover:text-gray-400'
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0ZM10 3.5a6.5 6.5 0 0 0-4.773 2.087A21.5 21.5 0 0 1 10 4.6c1.66 0 3.285.343 4.773.987A6.5 6.5 0 0 0 10 3.5Zm4.773 11.413A21.5 21.5 0 0 1 10 15.9a21.5 21.5 0 0 1-4.773-.987 6.5 6.5 0 0 0 9.546 0ZM10 13.5c-1.29 0-2.553-.11-3.775-.326a20 20 0 0 1 0-6.348A20.1 20.1 0 0 1 10 6.5c1.29 0 2.553.11 3.775.326a20 20 0 0 1 0 6.348A20.1 20.1 0 0 1 10 13.5Z"
              clipRule="evenodd"
            />
          </svg>
          検索
        </button>
      </div>
    </div>
  )
}
