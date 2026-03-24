import { ipcMain, shell } from 'electron'
import { streamText } from 'ai'
import { IpcChannels } from '@shared/ipc'
import type { IpcResult } from '@shared/ipc'
import type { ChatSendPayload, ChatStreamEvent } from '@shared/chat'
import { resolveModel } from '@shared/llm'
import type { LlmSettingsService } from '../services/llm-settings'
import { createLanguageModel, createProviderTools } from '../services/llm-client'
import { createAzureEntraTokenProvider } from '../services/azure-auth'

const MAX_MESSAGE_LENGTH = 10_000

let activeAbortController: AbortController | null = null
const tokenProviderCache = new Map<string, () => Promise<string>>()

export function registerChatHandlers(llmSettingsService: LlmSettingsService): void {
  ipcMain.handle(IpcChannels.CHAT_CANCEL, (): IpcResult<void> => {
    if (activeAbortController) {
      activeAbortController.abort()
      activeAbortController = null
    }
    return { success: true, data: undefined }
  })

  ipcMain.handle(
    IpcChannels.CHAT_SEND,
    async (event, payload: unknown): Promise<IpcResult<string>> => {
      if (!isValidChatPayload(payload)) {
        return { success: false, error: 'Invalid chat payload', code: 'INVALID_DATA' }
      }

      const lastMessage = payload.messages[payload.messages.length - 1]
      if (lastMessage && lastMessage.content.length > MAX_MESSAGE_LENGTH) {
        return { success: false, error: 'Message is too long', code: 'MESSAGE_TOO_LONG' }
      }

      const settings = llmSettingsService.getSettings()
      const resolved = resolveModel(settings, payload.model)
      if (!resolved) {
        return {
          success: false,
          error: 'モデルが見つかりません。プロバイダー設定を確認してください。',
          code: 'MODEL_NOT_FOUND',
        }
      }

      const { provider, model } = resolved

      if (provider.type === 'azure-openai') {
        console.log('[Azure OpenAI] apiVersion:', provider.apiVersion, 'baseUrl:', provider.baseUrl)
      }

      try {
        const webContents = event.sender
        const sendStreamEvent = (e: ChatStreamEvent): void => {
          if (!webContents.isDestroyed()) {
            webContents.send(IpcChannels.CHAT_STREAM, e)
          }
        }

        let azureTokenProvider: (() => Promise<string>) | undefined
        if (provider.type === 'azure-openai' && provider.azureAuthType === 'entra-id') {
          const cacheKey = `${provider.id}:${provider.tenantId ?? ''}`
          if (!tokenProviderCache.has(cacheKey)) {
            tokenProviderCache.set(
              cacheKey,
              createAzureEntraTokenProvider(provider.tenantId, (info) => {
                sendStreamEvent({
                  type: 'text-delta',
                  textDelta: `🔐 ${info.message}\n\n`,
                })
                shell.openExternal(info.verificationUri)
              }),
            )
          }
          azureTokenProvider = tokenProviderCache.get(cacheKey)
        }

        const { primary, fallback } = createLanguageModel(provider, model, azureTokenProvider)

        const providerTools =
          payload.tools && payload.tools.length > 0
            ? createProviderTools(provider, payload.tools, azureTokenProvider)
            : undefined

        const runStream = async (languageModel: typeof primary): Promise<string> => {
          const abortController = new AbortController()
          activeAbortController = abortController

          const result = streamText({
            model: languageModel,
            messages: payload.messages,
            abortSignal: abortController.signal,
            ...(providerTools ? { tools: providerTools } : {}),
          })

          let fullText = ''
          for await (const part of result.fullStream) {
            if (part.type === 'text-delta') {
              const delta =
                (part as { textDelta?: string; text?: string }).textDelta ??
                (part as { text?: string }).text ??
                ''
              if (delta) {
                fullText += delta
                sendStreamEvent({ type: 'text-delta', textDelta: delta })
              }
            } else if (part.type === 'tool-call') {
              const argsStr = part.args ? JSON.stringify(part.args).substring(0, 200) : ''
              console.log(`[Tool] called: ${part.toolName}`, argsStr)
              sendStreamEvent({
                type: 'tool-call',
                toolName: part.toolName,
                args: argsStr,
              })
            } else if (part.type === 'tool-result') {
              const resultStr = part.result ? String(part.result).substring(0, 200) : ''
              console.log(`[Tool] result: ${part.toolName}`, resultStr)
              sendStreamEvent({ type: 'tool-result', toolName: part.toolName })
            }
          }

          // Ensure any deferred errors are surfaced
          const response = await result.response

          // Extract sources from provider metadata (if web search was used)
          const sources = response.sources
            ?.map((s) => {
              if ('url' in s) {
                return {
                  url: s.url,
                  title: ('title' in s ? s.title : undefined) as string | undefined,
                }
              }
              return null
            })
            .filter((s): s is { url: string; title?: string } => s !== null)

          return JSON.stringify({ fullText, sources })
        }

        let resultJson: string
        try {
          resultJson = await runStream(primary)
        } catch (primaryErr) {
          if (primaryErr instanceof Error && primaryErr.name === 'AbortError') {
            throw primaryErr
          }
          if (fallback) {
            if (providerTools) {
              console.log(
                '[LLM] Primary API failed with tools enabled:',
                primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
              )
              // Web search tools are only supported on the Responses API.
              // Return a user-friendly message instead of falling back without search.
              const msg =
                'このモデルでは選択されたツールは利用できません。ツールをオフにしてお試しください。'
              sendStreamEvent({ type: 'text-delta', textDelta: msg })
              sendStreamEvent({ type: 'done' })
              activeAbortController = null
              return { success: true, data: msg }
            }
            console.log(
              '[LLM] Primary API failed, falling back to Chat Completions:',
              primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
            )
            resultJson = await runStream(fallback)
          } else {
            throw primaryErr
          }
        }

        activeAbortController = null

        const parsed = JSON.parse(resultJson) as {
          fullText: string
          sources?: { url: string; title?: string }[]
        }
        sendStreamEvent({
          type: 'done',
          sources: parsed.sources?.length ? parsed.sources : undefined,
        })
        return { success: true, data: parsed.fullText }
      } catch (err) {
        activeAbortController = null

        if (err instanceof Error && err.name === 'AbortError') {
          if (!event.sender.isDestroyed()) {
            event.sender.send(IpcChannels.CHAT_STREAM, {
              type: 'done',
            } satisfies ChatStreamEvent)
          }
          return { success: true, data: '' }
        }

        const errorMessage = err instanceof Error ? err.message : 'Unknown error'

        if (!event.sender.isDestroyed()) {
          event.sender.send(IpcChannels.CHAT_STREAM, {
            type: 'error',
            error: errorMessage,
          } satisfies ChatStreamEvent)
        }

        return { success: false, error: errorMessage, code: 'LLM_ERROR' }
      }
    },
  )
}

function isValidChatPayload(value: unknown): value is ChatSendPayload {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>

  if (!Array.isArray(obj.messages) || obj.messages.length === 0) return false
  const validRoles = ['user', 'assistant', 'system']
  for (const msg of obj.messages) {
    if (typeof msg !== 'object' || msg === null) return false
    const m = msg as Record<string, unknown>
    if (typeof m.role !== 'string' || !validRoles.includes(m.role)) return false
    if (typeof m.content !== 'string') return false
  }

  if (typeof obj.model !== 'object' || obj.model === null) return false
  const model = obj.model as Record<string, unknown>
  if (typeof model.providerId !== 'string' || typeof model.modelId !== 'string') return false

  if ('tools' in obj && !Array.isArray(obj.tools)) return false

  return true
}
