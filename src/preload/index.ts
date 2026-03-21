import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type { IpcResult } from '@shared/ipc'
import type { LlmProvider, LlmSettings, ModelSelection } from '@shared/llm'

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke(IpcChannels.PING),
  sendChat: (message: string): Promise<IpcResult<string>> =>
    ipcRenderer.invoke(IpcChannels.CHAT_SEND, message),
  getLlmSettings: (): Promise<IpcResult<LlmSettings>> =>
    ipcRenderer.invoke(IpcChannels.LLM_GET_SETTINGS),
  saveLlmProvider: (provider: LlmProvider): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IpcChannels.LLM_SAVE_PROVIDER, provider),
  deleteLlmProvider: (id: string): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IpcChannels.LLM_DELETE_PROVIDER, id),
  setLastUsedModel: (selection: ModelSelection | null): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IpcChannels.LLM_SET_LAST_USED, selection),
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronApi = typeof api
