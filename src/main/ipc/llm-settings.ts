import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type { IpcResult } from '@shared/ipc'
import type { LlmProvider, LlmSettings, ModelSelection } from '@shared/llm'
import type { LlmSettingsService } from '../services/llm-settings'

export function registerLlmSettingsHandlers(service: LlmSettingsService): void {
  ipcMain.handle(IpcChannels.LLM_GET_SETTINGS, (): IpcResult<LlmSettings> => {
    try {
      const settings = service.getSettingsForRenderer()
      return { success: true, data: settings }
    } catch {
      return { success: false, error: 'Failed to load LLM settings' }
    }
  })

  ipcMain.handle(IpcChannels.LLM_SAVE_PROVIDER, (_event, provider: unknown): IpcResult<void> => {
    try {
      if (!isValidProvider(provider)) {
        return { success: false, error: 'Invalid provider data', code: 'INVALID_DATA' }
      }
      service.saveProvider(provider)
      return { success: true, data: undefined }
    } catch {
      return { success: false, error: 'Failed to save provider' }
    }
  })

  ipcMain.handle(IpcChannels.LLM_DELETE_PROVIDER, (_event, id: unknown): IpcResult<void> => {
    try {
      if (typeof id !== 'string' || id.length === 0) {
        return { success: false, error: 'Invalid provider ID', code: 'INVALID_DATA' }
      }
      service.deleteProvider(id)
      return { success: true, data: undefined }
    } catch {
      return { success: false, error: 'Failed to delete provider' }
    }
  })

  ipcMain.handle(IpcChannels.LLM_SET_LAST_USED, (_event, selection: unknown): IpcResult<void> => {
    try {
      if (selection !== null && !isValidModelSelection(selection)) {
        return { success: false, error: 'Invalid model selection', code: 'INVALID_DATA' }
      }
      service.setLastUsedModel(selection as ModelSelection | null)
      return { success: true, data: undefined }
    } catch {
      return { success: false, error: 'Failed to set last used model' }
    }
  })
}

function isValidProvider(value: unknown): value is LlmProvider {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    (obj.apiKey === undefined || typeof obj.apiKey === 'string') &&
    (obj.baseUrl === undefined || typeof obj.baseUrl === 'string') &&
    (obj.azureAuthType === undefined ||
      obj.azureAuthType === 'api-key' ||
      obj.azureAuthType === 'entra-id') &&
    (obj.apiVersion === undefined || typeof obj.apiVersion === 'string') &&
    (obj.tenantId === undefined || typeof obj.tenantId === 'string') &&
    Array.isArray(obj.models) &&
    obj.models.every(
      (m: unknown) =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as Record<string, unknown>).id === 'string' &&
        typeof (m as Record<string, unknown>).name === 'string',
    ) &&
    typeof obj.enabled === 'boolean'
  )
}

function isValidModelSelection(value: unknown): value is ModelSelection {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return typeof obj.providerId === 'string' && typeof obj.modelId === 'string'
}
