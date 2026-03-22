import { useState, useCallback, useEffect, useRef } from 'react'
import type { AzureAuthType, LlmProvider, LlmProviderType, ModelSelection } from '@shared/llm'
import { AZURE_DEFAULT_API_VERSION, PROVIDER_TYPE_META, PROVIDER_MODEL_DEFAULTS } from '@shared/llm'

interface ProviderSettingsModalProps {
  providers: LlmProvider[]
  lastUsedModel: ModelSelection | null
  onSaveProvider: (provider: LlmProvider) => void
  onDeleteProvider: (id: string) => void
  onClose: () => void
}

type ViewState = { mode: 'list' } | { mode: 'edit'; provider: LlmProvider }

export function ProviderSettingsModal({
  providers,
  lastUsedModel,
  onSaveProvider,
  onDeleteProvider,
  onClose,
}: ProviderSettingsModalProps): React.JSX.Element {
  const [view, setView] = useState<ViewState>({ mode: 'list' })
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Focus trap and Escape handler
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null

    const dialog = dialogRef.current
    if (dialog) {
      const firstFocusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      firstFocusable?.focus()
    }

    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleAdd = useCallback(() => {
    const newProvider: LlmProvider = {
      id: crypto.randomUUID(),
      name: '',
      type: 'openai',
      apiKey: '',
      baseUrl: PROVIDER_TYPE_META.openai.defaultBaseUrl ?? '',
      models: [...PROVIDER_MODEL_DEFAULTS.openai],
      enabled: true,
    }
    setView({ mode: 'edit', provider: newProvider })
  }, [])

  const handleEdit = useCallback((provider: LlmProvider) => {
    setView({ mode: 'edit', provider: { ...provider } })
  }, [])

  const handleSave = useCallback(
    (provider: LlmProvider) => {
      onSaveProvider(provider)
      setView({ mode: 'list' })
    },
    [onSaveProvider],
  )

  const handleDelete = useCallback(
    (id: string) => {
      onDeleteProvider(id)
    },
    [onDeleteProvider],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-settings-title"
        className="mx-4 w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
      >
        {view.mode === 'list' ? (
          <ProviderList
            providers={providers}
            lastUsedModel={lastUsedModel}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onClose={onClose}
          />
        ) : (
          <ProviderForm
            provider={view.provider}
            isNew={!providers.some((p) => p.id === view.provider.id)}
            onSave={handleSave}
            onCancel={() => setView({ mode: 'list' })}
          />
        )}
      </div>
    </div>
  )
}

function ProviderList({
  providers,
  lastUsedModel,
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: {
  providers: LlmProvider[]
  lastUsedModel: ModelSelection | null
  onAdd: () => void
  onEdit: (provider: LlmProvider) => void
  onDelete: (id: string) => void
  onClose: () => void
}): React.JSX.Element {
  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
        <h2 id="provider-settings-title" className="text-base font-semibold text-white">
          LLM プロバイダー設定
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="text-gray-400 transition-colors hover:text-white"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
        {providers.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            プロバイダーが設定されていません。
            <br />
            下のボタンから追加してください。
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {providers.map((provider) => {
              const isLastUsed = lastUsedModel?.providerId === provider.id
              return (
                <div
                  key={provider.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3"
                >
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      provider.enabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                    aria-label={provider.enabled ? '有効' : '無効'}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {provider.name || PROVIDER_TYPE_META[provider.type].displayName}
                      </span>
                      {isLastUsed && (
                        <span className="rounded bg-blue-600/20 px-1.5 py-0.5 text-[10px] text-blue-400">
                          使用中
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {provider.type === 'azure-openai' && (
                        <span className="mr-1.5">
                          {provider.azureAuthType === 'entra-id' ? '[Entra ID]' : '[API Key]'}
                        </span>
                      )}
                      {provider.models.map((m) => m.name).join(', ') || 'モデル未設定'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(provider)}
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                      aria-label="編集"
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(provider.id)}
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-red-400"
                      aria-label="削除"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 px-5 py-4">
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-600 py-2.5 text-sm text-gray-400 transition-colors hover:border-gray-500 hover:text-white"
        >
          <PlusIcon />
          プロバイダーを追加
        </button>
      </div>
    </>
  )
}

function ProviderForm({
  provider: initial,
  isNew,
  onSave,
  onCancel,
}: {
  provider: LlmProvider
  isNew: boolean
  onSave: (provider: LlmProvider) => void
  onCancel: () => void
}): React.JSX.Element {
  const [provider, setProvider] = useState<LlmProvider>(initial)
  const [newModelId, setNewModelId] = useState('')
  const [newModelName, setNewModelName] = useState('')

  const meta = PROVIDER_TYPE_META[provider.type]
  const isAzure = provider.type === 'azure-openai'

  const handleTypeChange = useCallback((type: LlmProviderType) => {
    const typeMeta = PROVIDER_TYPE_META[type]
    const isAzure = type === 'azure-openai'
    setProvider((prev) => ({
      ...prev,
      type,
      baseUrl: typeMeta.defaultBaseUrl ?? prev.baseUrl ?? '',
      models: [...PROVIDER_MODEL_DEFAULTS[type]],
      azureAuthType: isAzure ? (prev.azureAuthType ?? 'api-key') : undefined,
      apiVersion: isAzure ? (prev.apiVersion ?? AZURE_DEFAULT_API_VERSION) : undefined,
      tenantId: isAzure ? prev.tenantId : undefined,
    }))
  }, [])

  const handleAddModel = useCallback(() => {
    const id = newModelId.trim()
    const name = newModelName.trim() || id
    if (!id) return
    setProvider((prev) => ({
      ...prev,
      models: [...prev.models, { id, name }],
    }))
    setNewModelId('')
    setNewModelName('')
  }, [newModelId, newModelName])

  const handleRemoveModel = useCallback((modelId: string) => {
    setProvider((prev) => ({
      ...prev,
      models: prev.models.filter((m) => m.id !== modelId),
    }))
  }, [])

  const canSave = provider.name.trim().length > 0 && provider.models.length > 0

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
        <h2 id="provider-settings-title" className="text-base font-semibold text-white">
          {isNew ? 'プロバイダーを追加' : 'プロバイダーを編集'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="閉じる"
          className="text-gray-400 transition-colors hover:text-white"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
        {/* Provider Type */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">タイプ</label>
          <select
            value={provider.type}
            onChange={(e) => handleTypeChange(e.target.value as LlmProviderType)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            {(Object.keys(PROVIDER_TYPE_META) as LlmProviderType[]).map((type) => (
              <option key={type} value={type}>
                {PROVIDER_TYPE_META[type].displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">表示名</label>
          <input
            type="text"
            value={provider.name}
            onChange={(e) => setProvider((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={meta.displayName}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
          />
        </div>

        {/* Azure: Auth Type */}
        {isAzure && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">認証方式</label>
            <select
              value={provider.azureAuthType ?? 'api-key'}
              onChange={(e) => {
                const authType = e.target.value as AzureAuthType
                setProvider((prev) => ({
                  ...prev,
                  azureAuthType: authType,
                  apiKey: authType === 'entra-id' ? undefined : prev.apiKey,
                  tenantId: authType === 'api-key' ? undefined : prev.tenantId,
                }))
              }}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="api-key">API キー</option>
              <option value="entra-id">Microsoft Entra ID</option>
            </select>
          </div>
        )}

        {/* API Key */}
        {(meta.requiresApiKey || (isAzure && provider.azureAuthType === 'api-key')) && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">API キー</label>
            <input
              type="password"
              value={provider.apiKey ?? ''}
              onChange={(e) => setProvider((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder="sk-..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Base URL */}
        {(meta.requiresBaseUrl || provider.baseUrl) && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              {isAzure ? 'エンドポイント' : 'ベース URL'} {!meta.requiresBaseUrl && '(任意)'}
            </label>
            <input
              type="url"
              value={provider.baseUrl ?? ''}
              onChange={(e) => setProvider((prev) => ({ ...prev, baseUrl: e.target.value }))}
              placeholder={
                isAzure
                  ? 'https://{リソース名}.openai.azure.com/'
                  : (meta.defaultBaseUrl ?? 'https://...')
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Azure: Tenant ID (Entra ID only) */}
        {isAzure && provider.azureAuthType === 'entra-id' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              テナント ID (任意)
            </label>
            <input
              type="text"
              value={provider.tenantId ?? ''}
              onChange={(e) => setProvider((prev) => ({ ...prev, tenantId: e.target.value }))}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              未指定の場合、Azure CLI
              等の既存認証を試行し、失敗時にブラウザ認証へフォールバックします
            </p>
          </div>
        )}

        {/* Azure: API Version */}
        {isAzure && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">API バージョン</label>
            <input
              type="text"
              value={provider.apiVersion ?? AZURE_DEFAULT_API_VERSION}
              onChange={(e) => setProvider((prev) => ({ ...prev, apiVersion: e.target.value }))}
              placeholder={AZURE_DEFAULT_API_VERSION}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Enabled toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={provider.enabled}
            aria-label="プロバイダーを有効にする"
            onClick={() => setProvider((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              provider.enabled ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                provider.enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className="text-sm text-gray-300">有効</span>
        </div>

        {/* Models */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">モデル</label>
          {provider.models.length > 0 && (
            <div className="mb-2 flex flex-col gap-1">
              {provider.models.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center gap-2 rounded border border-gray-700 bg-gray-800/50 px-3 py-1.5"
                >
                  <span className="flex-1 text-xs text-gray-300">
                    <span className="text-white">{model.name}</span>
                    {model.name !== model.id && (
                      <span className="ml-1.5 text-gray-500">({model.id})</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveModel(model.id)}
                    aria-label={`${model.name} を削除`}
                    className="text-gray-500 transition-colors hover:text-red-400"
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newModelId}
              onChange={(e) => setNewModelId(e.target.value)}
              placeholder={isAzure ? 'デプロイメント名 (例: gpt-4o)' : 'モデルID (例: gpt-4o)'}
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
            />
            <input
              type="text"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder="表示名 (任意)"
              className="w-28 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
            />
            <button
              type="button"
              onClick={handleAddModel}
              disabled={!newModelId.trim()}
              className="rounded-lg bg-gray-700 px-2.5 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-600 hover:text-white disabled:opacity-40"
            >
              追加
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-700 px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => onSave(provider)}
          disabled={!canSave}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
        >
          保存
        </button>
      </div>
    </>
  )
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}

function EditIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3.5 w-3.5"
    >
      <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
      <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
    </svg>
  )
}

function TrashIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3.5 w-3.5"
    >
      <path
        fillRule="evenodd"
        d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function PlusIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
    </svg>
  )
}
