import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '@shared/ipc'

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke(IpcChannels.PING),
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronApi = typeof api
