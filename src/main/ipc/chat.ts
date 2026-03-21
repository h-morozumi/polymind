import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type { IpcResult } from '@shared/ipc'

const MAX_MESSAGE_LENGTH = 10_000

export function registerChatHandlers(): void {
  ipcMain.handle(
    IpcChannels.CHAT_SEND,
    async (_event, message: unknown): Promise<IpcResult<string>> => {
      if (typeof message !== 'string') {
        return { success: false, error: 'Message must be a string', code: 'INVALID_TYPE' }
      }

      if (message.length === 0) {
        return { success: false, error: 'Message cannot be empty', code: 'EMPTY_MESSAGE' }
      }

      if (message.length > MAX_MESSAGE_LENGTH) {
        return { success: false, error: 'Message is too long', code: 'MESSAGE_TOO_LONG' }
      }

      try {
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000))
        const reply = `You said: "${message}"\n\nThis is a mock response from the main process. AI integration coming soon!`
        return { success: true, data: reply }
      } catch {
        return { success: false, error: 'Failed to process message', code: 'INTERNAL_ERROR' }
      }
    },
  )
}
