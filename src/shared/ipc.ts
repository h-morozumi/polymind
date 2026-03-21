export const IpcChannels = {
  PING: 'ping',
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
