import type { LanguageModelV1, ToolSet } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAzure } from '@ai-sdk/azure'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createXai } from '@ai-sdk/xai'
import type { LlmProvider, LlmModel, ToolId } from '@shared/llm'

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

    case 'grok': {
      const xai = createXai({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl || undefined,
      })
      return { primary: xai.responses(model.id), fallback: xai.chat(model.id) }
    }

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

/**
 * Creates provider-native tools for use with streamText().
 * Returns undefined if no tools are requested or none are supported.
 */
export function createProviderTools(
  provider: LlmProvider,
  toolIds: ToolId[],
  azureTokenProvider?: () => Promise<string>,
): ToolSet | undefined {
  if (toolIds.length === 0) return undefined

  const tools: ToolSet = {}

  switch (provider.type) {
    case 'openai': {
      const openai = createOpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl || undefined,
      })
      for (const id of toolIds) {
        if (id === 'web-search') tools.web_search = openai.tools.webSearch({})
        if (id === 'code-execution') tools.code_interpreter = openai.tools.codeInterpreter({})
        if (id === 'image-generation') tools.image_generation = openai.tools.imageGeneration({})
        if (id === 'file-search') tools.file_search = openai.tools.fileSearch({})
        if (id === 'shell') tools.shell = openai.tools.shell({})
      }
      break
    }

    case 'azure-openai': {
      if (isAzureV1Endpoint(provider.baseUrl)) {
        const openai =
          provider.azureAuthType === 'entra-id' && azureTokenProvider
            ? createOpenAI({
                apiKey: 'entra-id-placeholder',
                baseURL: provider.baseUrl,
                fetch: async (url, init) => {
                  const token = await azureTokenProvider()
                  const headers = new Headers(init?.headers as HeadersInit)
                  headers.set('Authorization', `Bearer ${token}`)
                  return globalThis.fetch(url, { ...init, headers })
                },
              })
            : createOpenAI({ apiKey: provider.apiKey, baseURL: provider.baseUrl })
        for (const id of toolIds) {
          if (id === 'web-search') tools.web_search = openai.tools.webSearch({})
          if (id === 'code-execution') tools.code_interpreter = openai.tools.codeInterpreter({})
          if (id === 'image-generation') tools.image_generation = openai.tools.imageGeneration({})
          if (id === 'file-search') tools.file_search = openai.tools.fileSearch({})
        }
      } else {
        const azure =
          provider.azureAuthType === 'entra-id' && azureTokenProvider
            ? createAzure({
                resourceName: extractAzureResourceName(provider.baseUrl),
                apiVersion: provider.apiVersion,
                headers: async () => {
                  const token = await azureTokenProvider()
                  return { Authorization: `Bearer ${token}` }
                },
              })
            : createAzure({
                apiKey: provider.apiKey,
                resourceName: extractAzureResourceName(provider.baseUrl),
                apiVersion: provider.apiVersion,
              })
        for (const id of toolIds) {
          if (id === 'web-search') tools.web_search = azure.tools.webSearchPreview({})
          if (id === 'code-execution') tools.code_interpreter = azure.tools.codeInterpreter({})
          if (id === 'image-generation') tools.image_generation = azure.tools.imageGeneration({})
          if (id === 'file-search') tools.file_search = azure.tools.fileSearch({})
        }
      }
      break
    }

    case 'claude': {
      const anthropic = createAnthropic({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl || undefined,
      })
      for (const id of toolIds) {
        if (id === 'web-search') tools.web_search = anthropic.tools.webSearch_20250305({})
        if (id === 'code-execution')
          tools.code_execution = anthropic.tools.codeExecution_20260120({})
        if (id === 'shell')
          tools.bash = anthropic.tools.bash_20250124({
            execute: async ({ command }) => {
              const { exec } = await import('child_process')
              const { promisify } = await import('util')
              const execAsync = promisify(exec)
              try {
                const { stdout, stderr } = await execAsync(command, { timeout: 30_000 })
                return [stdout, stderr].filter(Boolean).join('\n')
              } catch (err) {
                const e = err as { stderr?: string; message?: string }
                return e.stderr || e.message || 'Command failed'
              }
            },
          })
        if (id === 'text-editor')
          tools.text_editor = anthropic.tools.textEditor_20250429({
            execute: async (input) => {
              const fs = await import('fs/promises')
              const { command, path: filePath } = input as {
                command: string
                path: string
                file_text?: string
                old_str?: string
                new_str?: string
                insert_line?: number
              }
              try {
                if (command === 'view') {
                  return await fs.readFile(filePath, 'utf-8')
                }
                if (command === 'create') {
                  await fs.writeFile(filePath, (input as { file_text?: string }).file_text ?? '')
                  return 'File created'
                }
                if (command === 'str_replace') {
                  const content = await fs.readFile(filePath, 'utf-8')
                  const { old_str, new_str } = input as { old_str?: string; new_str?: string }
                  if (!old_str) return 'old_str is required'
                  const updated = content.replace(old_str, new_str ?? '')
                  await fs.writeFile(filePath, updated)
                  return 'Replacement done'
                }
                if (command === 'insert') {
                  const content = await fs.readFile(filePath, 'utf-8')
                  const { insert_line, new_str } = input as {
                    insert_line?: number
                    new_str?: string
                  }
                  const lines = content.split('\n')
                  lines.splice(insert_line ?? 0, 0, new_str ?? '')
                  await fs.writeFile(filePath, lines.join('\n'))
                  return 'Insertion done'
                }
                return `Unknown command: ${command}`
              } catch (err) {
                return (err as Error).message
              }
            },
          })
        if (id === 'url-context') tools.web_fetch = anthropic.tools.webFetch_20250910({})
      }
      break
    }

    case 'gemini': {
      const google = createGoogleGenerativeAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl || undefined,
      })
      for (const id of toolIds) {
        if (id === 'web-search') tools.google_search = google.tools.googleSearch({})
        if (id === 'code-execution') tools.code_execution = google.tools.codeExecution({})
        if (id === 'file-search') tools.file_search = google.tools.fileSearch({})
        if (id === 'url-context') tools.url_context = google.tools.urlContext({})
        if (id === 'google-maps') tools.google_maps = google.tools.googleMaps({})
      }
      break
    }

    case 'grok': {
      const xai = createXai({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl || undefined,
      })
      for (const id of toolIds) {
        if (id === 'web-search') tools.web_search = xai.tools.webSearch({})
        if (id === 'x-search') tools.x_search = xai.tools.xSearch({})
        if (id === 'code-execution') tools.code_execution = xai.tools.codeExecution({})
        if (id === 'file-search') tools.file_search = xai.tools.fileSearch({})
      }
      break
    }

    default:
      return undefined
  }

  return Object.keys(tools).length > 0 ? tools : undefined
}
