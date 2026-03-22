import type { ModelSelection } from './llm'

/** Message format sent from renderer to main for LLM completion */
export interface ChatCompletionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** Payload for the chat:send IPC call */
export interface ChatSendPayload {
  messages: ChatCompletionMessage[]
  model: ModelSelection
}

/** Streaming chunk sent from main to renderer */
export type ChatStreamEvent =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'done' }
  | { type: 'error'; error: string }
