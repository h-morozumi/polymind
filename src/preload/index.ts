import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type { IpcResult } from '@shared/ipc'

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke(IpcChannels.PING),
  sendChat: (message: string): Promise<IpcResult<string>> =>
    ipcRenderer.invoke(IpcChannels.CHAT_SEND, message),
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronApi = typeof api
