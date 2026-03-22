import { ipcMain } from 'electron'
import { streamText } from 'ai'
import { IpcChannels } from '@shared/ipc'
import type { IpcResult } from '@shared/ipc'
import type { ChatSendPayload, ChatStreamEvent } from '@shared/chat'
import { resolveModel } from '@shared/llm'
import type { LlmSettingsService } from '../services/llm-settings'
import { createLanguageModel } from '../services/llm-client'
import { createAzureEntraTokenProvider } from '../services/azure-auth'

const MAX_MESSAGE_LENGTH = 10_000

let activeAbortController: AbortController | null = null

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
        let azureTokenProvider: (() => Promise<string>) | undefined
        if (provider.type === 'azure-openai' && provider.azureAuthType === 'entra-id') {
          azureTokenProvider = createAzureEntraTokenProvider(provider.tenantId)
        }

        const { primary, fallback } = createLanguageModel(provider, model, azureTokenProvider)
        const webContents = event.sender

        const sendStreamEvent = (e: ChatStreamEvent): void => {
          if (!webContents.isDestroyed()) {
            webContents.send(IpcChannels.CHAT_STREAM, e)
          }
        }

        const runStream = async (languageModel: typeof primary): Promise<string> => {
          const abortController = new AbortController()
          activeAbortController = abortController

          const result = streamText({
            model: languageModel,
            messages: payload.messages,
            abortSignal: abortController.signal,
          })

          let fullText = ''
          for await (const chunk of result.textStream) {
            fullText += chunk
            sendStreamEvent({ type: 'text-delta', textDelta: chunk })
          }

          // Ensure any deferred errors are surfaced
          await result.response
          return fullText
        }

        let fullText: string
        try {
          fullText = await runStream(primary)
        } catch (primaryErr) {
          if (primaryErr instanceof Error && primaryErr.name === 'AbortError') {
            throw primaryErr
          }
          if (fallback) {
            console.log(
              '[LLM] Primary API failed, falling back to Chat Completions:',
              primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
            )
            fullText = await runStream(fallback)
          } else {
            throw primaryErr
          }
        }

        activeAbortController = null
        sendStreamEvent({ type: 'done' })
        return { success: true, data: fullText }
      } catch (err) {
        activeAbortController = null

        if (err instanceof Error && err.name === 'AbortError') {
          const webContents = event.sender
          if (!webContents.isDestroyed()) {
            webContents.send(IpcChannels.CHAT_STREAM, { type: 'done' } satisfies ChatStreamEvent)
          }
          return { success: true, data: '' }
        }

        const errorMessage = err instanceof Error ? err.message : 'Unknown error'

        const webContents = event.sender
        if (!webContents.isDestroyed()) {
          webContents.send(IpcChannels.CHAT_STREAM, {
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

  return true
}
