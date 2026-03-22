import type { LanguageModelV1 } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAzure } from '@ai-sdk/azure'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { LlmProvider, LlmModel } from '@shared/llm'

/**
 * Creates a Vercel AI SDK LanguageModelV1 from a provider config and model.
 * For Azure Entra ID, the caller must supply a tokenProvider obtained from @azure/identity.
 */
export function createLanguageModel(
  provider: LlmProvider,
  model: LlmModel,
  azureTokenProvider?: () => Promise<string>,
): LanguageModelV1 {
  switch (provider.type) {
    case 'openai': {
      const openai = createOpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl || undefined,
      })
      return openai(model.id)
    }

    case 'azure-openai': {
      if (provider.azureAuthType === 'entra-id') {
        if (!azureTokenProvider) {
          throw new Error('Azure Entra ID 認証にはトークンプロバイダーが必要です')
        }
        const azure = createAzure({
          resourceName: extractAzureResourceName(provider.baseUrl),
          apiVersion: provider.apiVersion,
          headers: async () => {
            const token = await azureTokenProvider()
            return { Authorization: `Bearer ${token}` }
          },
        })
        return azure(model.id)
      }
      const azure = createAzure({
        apiKey: provider.apiKey,
        resourceName: extractAzureResourceName(provider.baseUrl),
        apiVersion: provider.apiVersion,
      })
      return azure(model.id)
    }

    case 'claude': {
      const anthropic = createAnthropic({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl || undefined,
      })
      return anthropic(model.id)
    }

    case 'gemini': {
      const google = createGoogleGenerativeAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl || undefined,
      })
      return google(model.id)
    }

    case 'grok':
    case 'ollama':
    case 'openai-compatible': {
      const compat = createOpenAI({
        apiKey: provider.apiKey || 'ollama',
        baseURL: provider.baseUrl || undefined,
      })
      return compat(model.id)
    }

    default:
      throw new Error(`Unsupported provider type: ${provider.type}`)
  }
}

/**
 * Extracts the Azure resource name from a full endpoint URL.
 * e.g. "https://my-resource.openai.azure.com/" → "my-resource"
 */
function extractAzureResourceName(baseUrl?: string): string | undefined {
  if (!baseUrl) return undefined
  try {
    const hostname = new URL(baseUrl).hostname
    const match = hostname.match(/^([^.]+)\.openai\.azure\.com$/)
    return match ? match[1] : undefined
  } catch {
    return undefined
  }
}
