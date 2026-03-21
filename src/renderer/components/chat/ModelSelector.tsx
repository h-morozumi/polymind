import { useState, useRef, useEffect, useCallback, useMemo, type KeyboardEvent } from 'react'
import type { LlmProvider, ModelSelection } from '@shared/llm'

interface FlatModelItem {
  providerId: string
  modelId: string
  modelName: string
}

interface ModelSelectorProps {
  providers: LlmProvider[]
  selectedModel: ModelSelection | null
  onSelect: (selection: ModelSelection) => void
  disabled?: boolean
}

export function ModelSelector({
  providers,
  selectedModel,
  onSelect,
  disabled,
}: ModelSelectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const enabledProviders = providers.filter((p) => p.enabled && p.models.length > 0)

  const flatItems = useMemo<FlatModelItem[]>(
    () =>
      enabledProviders.flatMap((p) =>
        p.models.map((m) => ({ providerId: p.id, modelId: m.id, modelName: m.name })),
      ),
    [enabledProviders],
  )

  const selectedLabel = getSelectedLabel(enabledProviders, selectedModel)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, handleClickOutside])

  const handleSelect = useCallback(
    (providerId: string, modelId: string) => {
      onSelect({ providerId, modelId })
      setIsOpen(false)
    },
    [onSelect],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setIsOpen(true)
          setHighlightIndex(0)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (highlightIndex >= 0 && highlightIndex < flatItems.length) {
            const item = flatItems[highlightIndex]
            handleSelect(item.providerId, item.modelId)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
      }
    },
    [isOpen, flatItems, highlightIndex, handleSelect],
  )

  useEffect(() => {
    if (isOpen && highlightIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${highlightIndex}"]`)
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [isOpen, highlightIndex])

  let itemIndex = 0

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-40"
      >
        <ModelIcon />
        <span className="max-w-[180px] truncate">{selectedLabel}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && enabledProviders.length > 0 ? (
        <div
          ref={listRef}
          role="listbox"
          aria-label="モデル選択"
          onKeyDown={handleKeyDown}
          className="absolute bottom-full left-0 z-50 mb-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl"
        >
          {enabledProviders.map((provider) => (
            <div key={provider.id} role="group" aria-label={provider.name}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {provider.name}
              </div>
              {provider.models.map((model) => {
                const currentIndex = itemIndex++
                const isSelected =
                  selectedModel?.providerId === provider.id && selectedModel?.modelId === model.id
                const isHighlighted = currentIndex === highlightIndex
                return (
                  <button
                    key={`${provider.id}/${model.id}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-index={currentIndex}
                    onClick={() => handleSelect(provider.id, model.id)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                      isHighlighted
                        ? 'bg-gray-800 text-white'
                        : isSelected
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected ? 'bg-blue-400' : 'bg-transparent'
                      }`}
                    />
                    {model.name}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function getSelectedLabel(providers: LlmProvider[], selection: ModelSelection | null): string {
  if (!selection) return 'モデルを選択'
  for (const p of providers) {
    if (p.id === selection.providerId) {
      const model = p.models.find((m) => m.id === selection.modelId)
      if (model) return model.name
    }
  }
  return 'モデルを選択'
}

function ModelIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
    >
      <path d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.062a.75.75 0 0 1-1.062-1.061l1.061-1.06a.75.75 0 0 1 1.06 0ZM3 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3 8ZM14 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 14 8ZM7.172 13.828a.75.75 0 0 1-1.061-1.06l1.06-1.062a.75.75 0 0 1 1.062 1.061l-1.06 1.06ZM10 18a.75.75 0 0 1-.75-.75v-1.5a.75.75 0 0 1 1.5 0v1.5A.75.75 0 0 1 10 18ZM12.828 13.828a.75.75 0 0 1 0-1.06l1.061-1.062a.75.75 0 1 1 1.06 1.061l-1.06 1.06a.75.75 0 0 1-1.06 0ZM10 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  )
}

function ChevronIcon({ isOpen }: { isOpen: boolean }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
    >
      <path
        fillRule="evenodd"
        d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}
