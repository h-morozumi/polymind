import type { LanguageModelV1 } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAzure } from '@ai-sdk/azure'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { LlmProvider, LlmModel } from '@shared/llm'

export interface LanguageModelPair {
  primary: LanguageModelV1
  fallback?: LanguageModelV1
}

/**
 * Creates AI SDK LanguageModel(s) from a provider config and model.
 * For Azure OpenAI, returns both Responses API (primary) and Chat Completions (fallback).
 */
export function createLanguageModel(
  provider: LlmProvider,
  model: LlmModel,
  azureTokenProvider?: () => Promise<string>,
): LanguageModelPair {
  switch (provider.type) {
    case 'openai': {
      const openai = createOpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl || undefined,
      })
      return { primary: openai(model.id), fallback: openai.chat(model.id) }
    }

    case 'azure-openai': {
      // v1 endpoint: treat as OpenAI-compatible
      if (isAzureV1Endpoint(provider.baseUrl)) {
        if (provider.azureAuthType === 'entra-id') {
          if (!azureTokenProvider) {
            throw new Error('Azure Entra ID 認証にはトークンプロバイダーが必要です')
          }
          const openai = createOpenAI({
            apiKey: 'entra-id-placeholder',
            baseURL: provider.baseUrl,
            fetch: async (url, init) => {
              const token = await azureTokenProvider()
              const headers = new Headers(init?.headers as HeadersInit)
              headers.set('Authorization', `Bearer ${token}`)
              return globalThis.fetch(url, { ...init, headers })
            },
          })
          return { primary: openai(model.id), fallback: openai.chat(model.id) }
        }
        const openai = createOpenAI({
          apiKey: provider.apiKey,
          baseURL: provider.baseUrl,
        })
        return { primary: openai(model.id), fallback: openai.chat(model.id) }
      }

      // Classic Azure endpoint
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
        return { primary: azure(model.id), fallback: azure.chat(model.id) }
      }
      const azure = createAzure({
        apiKey: provider.apiKey,
        resourceName: extractAzureResourceName(provider.baseUrl),
        apiVersion: provider.apiVersion,
      })
      return { primary: azure(model.id), fallback: azure.chat(model.id) }
    }

    case 'claude': {
      const anthropic = createAnthropic({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl || undefined,
      })
      return { primary: anthropic(model.id) }
    }

    case 'gemini': {
      const google = createGoogleGenerativeAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl || undefined,
      })
      return { primary: google(model.id) }
    }

    case 'grok':
    case 'ollama':
    case 'openai-compatible': {
      const compat = createOpenAI({
        apiKey: provider.apiKey || 'ollama',
        baseURL: provider.baseUrl || undefined,
      })
      return { primary: compat(model.id), fallback: compat.chat(model.id) }
    }

    default:
      throw new Error(`Unsupported provider type: ${provider.type}`)
  }
}

/**
 * Checks if the Azure endpoint uses the v1 API (OpenAI-compatible, no api-version needed).
 */
function isAzureV1Endpoint(baseUrl?: string): boolean {
  if (!baseUrl) return false
  const normalized = baseUrl.replace(/\/+$/, '')
  return normalized.endsWith('/v1') || normalized.endsWith('/openai/v1')
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
