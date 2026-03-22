export type LlmProviderType =
  | 'openai'
  | 'azure-openai'
  | 'gemini'
  | 'claude'
  | 'grok'
  | 'ollama'
  | 'openai-compatible'

export type AzureAuthType = 'api-key' | 'entra-id'

export const AZURE_DEFAULT_API_VERSION = '2025-01-01-preview'

export interface LlmModel {
  id: string
  name: string
}

export interface LlmProvider {
  id: string
  name: string
  type: LlmProviderType
  apiKey?: string
  baseUrl?: string
  models: LlmModel[]
  enabled: boolean
  /** Azure OpenAI only: authentication method */
  azureAuthType?: AzureAuthType
  /** Azure OpenAI only: API version */
  apiVersion?: string
  /** Azure OpenAI (Entra ID) only: tenant ID */
  tenantId?: string
}

export interface ModelSelection {
  providerId: string
  modelId: string
}

export interface LlmSettings {
  providers: LlmProvider[]
  lastUsedModel: ModelSelection | null
}

export const PROVIDER_TYPE_META: Record<
  LlmProviderType,
  {
    displayName: string
    requiresApiKey: boolean
    requiresBaseUrl: boolean
    defaultBaseUrl?: string
  }
> = {
  openai: {
    displayName: 'OpenAI',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  'azure-openai': {
    displayName: 'Azure OpenAI',
    requiresApiKey: false,
    requiresBaseUrl: true,
  },
  gemini: {
    displayName: 'Google Gemini',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
  claude: {
    displayName: 'Anthropic Claude',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://api.anthropic.com/v1',
  },
  grok: {
    displayName: 'xAI Grok',
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultBaseUrl: 'https://api.x.ai/v1',
  },
  ollama: {
    displayName: 'Ollama (ローカル)',
    requiresApiKey: false,
    requiresBaseUrl: true,
    defaultBaseUrl: 'http://localhost:11434',
  },
  'openai-compatible': {
    displayName: 'OpenAI互換',
    requiresApiKey: false,
    requiresBaseUrl: true,
  },
}

export const PROVIDER_MODEL_DEFAULTS: Record<LlmProviderType, LlmModel[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4.1', name: 'GPT-4.1' },
    { id: 'o3-mini', name: 'o3 Mini' },
  ],
  'azure-openai': [],
  gemini: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  ],
  claude: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  ],
  grok: [
    { id: 'grok-3', name: 'Grok 3' },
    { id: 'grok-3-mini', name: 'Grok 3 Mini' },
  ],
  ollama: [],
  'openai-compatible': [],
}

export function createDefaultSettings(): LlmSettings {
  return {
    providers: [],
    lastUsedModel: null,
  }
}

export function resolveModel(
  settings: LlmSettings,
  selection: ModelSelection | null,
): { provider: LlmProvider; model: LlmModel } | null {
  if (!selection) return null
  const provider = settings.providers.find((p) => p.id === selection.providerId && p.enabled)
  if (!provider) return null
  const model = provider.models.find((m) => m.id === selection.modelId)
  if (!model) return null
  return { provider, model }
}
