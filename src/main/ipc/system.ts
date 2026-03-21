import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipc'

export function registerSystemHandlers(): void {
  ipcMain.handle(IpcChannels.PING, () => 'pong')
}
