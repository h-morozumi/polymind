export const IpcChannels = {
  PING: 'ping',
  CHAT_SEND: 'chat:send',
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
