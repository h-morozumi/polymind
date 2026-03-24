import { useState, useRef, useEffect, useCallback } from 'react'
import type { ToolId, LlmProviderType } from '@shared/llm'
import { TOOL_META, PROVIDER_AVAILABLE_TOOLS } from '@shared/llm'

export function ToolPalette({
  providerType,
  activeTools,
  onToggle,
  disabled,
}: {
  providerType: LlmProviderType | undefined
  activeTools: ToolId[]
  onToggle: (toolId: ToolId) => void
  disabled: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const availableTools = providerType ? PROVIDER_AVAILABLE_TOOLS[providerType] : []
  const activeCount = activeTools.filter((t) => availableTools.includes(t)).length

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    },
    [setOpen],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, handleClickOutside])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled || availableTools.length === 0}
        title={availableTools.length === 0 ? 'このプロバイダーにはツールがありません' : 'ツール'}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
          activeCount > 0
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
            d="M14.5 10a4.5 4.5 0 0 0 4.284-5.882c-.105-.324-.51-.391-.752-.15L15.34 6.66a.454.454 0 0 1-.493.101 3.046 3.046 0 0 1-1.608-1.607.454.454 0 0 1 .1-.493l2.693-2.692c.24-.241.174-.647-.15-.752a4.5 4.5 0 0 0-5.873 4.575c.055.873-.128 1.808-.8 2.368l-7.23 6.024a2.724 2.724 0 1 0 3.837 3.837l6.024-7.23c.56-.672 1.495-.855 2.368-.8.096.007.193.01.291.01ZM5 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
            clipRule="evenodd"
          />
        </svg>
        ツール{activeCount > 0 && <span className="font-semibold">{activeCount}</span>}
      </button>

      {open && availableTools.length > 0 && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border border-gray-700 bg-gray-900 py-2 shadow-xl">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400">ツール</div>
          {availableTools.map((toolId) => {
            const meta = TOOL_META[toolId]
            const isActive = activeTools.includes(toolId)
            return (
              <button
                key={toolId}
                type="button"
                onClick={() => onToggle(toolId)}
                className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm transition-colors hover:bg-gray-800"
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    isActive
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-gray-600 bg-gray-800'
                  }`}
                >
                  {isActive && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="h-3 w-3"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <div className={isActive ? 'text-white' : 'text-gray-300'}>
                    {meta.displayName}
                  </div>
                  <div className="truncate text-xs text-gray-500">{meta.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
