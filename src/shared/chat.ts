import type { ModelSelection, ToolId } from './llm'

/** Message format sent from renderer to main for LLM completion */
export interface ChatCompletionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** Payload for the chat:send IPC call */
export interface ChatSendPayload {
  messages: ChatCompletionMessage[]
  model: ModelSelection
  tools?: ToolId[]
}

/** Source citation returned from web search */
export interface ChatSource {
  url: string
  title?: string
}

/** Streaming chunk sent from main to renderer */
export type ChatStreamEvent =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'done'; sources?: ChatSource[] }
  | { type: 'error'; error: string }
