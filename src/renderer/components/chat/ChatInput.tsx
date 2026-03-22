import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import type { LlmProvider, ModelSelection } from '@shared/llm'
import { ModelSelector } from './ModelSelector'

export function ChatInput({
  onSend,
  disabled,
  providers,
  selectedModel,
  onModelSelect,
}: {
  onSend: (message: string) => void
  disabled: boolean
  providers: LlmProvider[]
  selectedModel: ModelSelection | null
  onModelSelect: (selection: ModelSelection) => void
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
          placeholder="メッセージを入力..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600"
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
      </div>
      <div className="mx-auto mt-2 max-w-3xl">
        <ModelSelector
          providers={providers}
          selectedModel={selectedModel}
          onSelect={onModelSelect}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
