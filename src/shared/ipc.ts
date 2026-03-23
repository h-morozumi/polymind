export const IpcChannels = {
  PING: 'ping',
  CHAT_SEND: 'chat:send',
  CHAT_STREAM: 'chat:stream',
  CHAT_CANCEL: 'chat:cancel',
  LLM_GET_SETTINGS: 'llm:get-settings',
  LLM_SAVE_PROVIDER: 'llm:save-provider',
  LLM_DELETE_PROVIDER: 'llm:delete-provider',
  LLM_SET_LAST_USED: 'llm:set-last-used',
  OPEN_EXTERNAL: 'shell:open-external',
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
