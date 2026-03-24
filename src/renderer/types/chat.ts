export type MessageRole = 'user' | 'assistant'

export interface ToolStatus {
  toolName: string
  status: 'calling' | 'done'
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  modelId?: string
  modelName?: string
  toolStatuses?: ToolStatus[]
}
