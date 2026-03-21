import { describe, it, expect } from 'vitest'
import {
  createDefaultSettings,
  resolveModel,
  PROVIDER_TYPE_META,
  PROVIDER_MODEL_DEFAULTS,
} from '@shared/llm'
import type { LlmSettings, LlmProvider } from '@shared/llm'

describe('createDefaultSettings', () => {
  it('returns empty providers and null lastUsedModel', () => {
    const settings = createDefaultSettings()
    expect(settings.providers).toEqual([])
    expect(settings.lastUsedModel).toBeNull()
  })
})

describe('resolveModel', () => {
  const provider: LlmProvider = {
    id: 'test-provider',
    name: 'Test',
    type: 'openai',
    models: [
      { id: 'model-1', name: 'Model 1' },
      { id: 'model-2', name: 'Model 2' },
    ],
    enabled: true,
  }

  const settings: LlmSettings = {
    providers: [provider],
    lastUsedModel: null,
  }

  it('resolves a valid model selection', () => {
    const result = resolveModel(settings, {
      providerId: 'test-provider',
      modelId: 'model-1',
    })
    expect(result).not.toBeNull()
    expect(result!.provider.id).toBe('test-provider')
    expect(result!.model.id).toBe('model-1')
  })

  it('returns null for null selection', () => {
    expect(resolveModel(settings, null)).toBeNull()
  })

  it('returns null for unknown provider', () => {
    const result = resolveModel(settings, {
      providerId: 'unknown',
      modelId: 'model-1',
    })
    expect(result).toBeNull()
  })

  it('returns null for unknown model', () => {
    const result = resolveModel(settings, {
      providerId: 'test-provider',
      modelId: 'unknown',
    })
    expect(result).toBeNull()
  })

  it('returns null for disabled provider', () => {
    const disabledSettings: LlmSettings = {
      providers: [{ ...provider, enabled: false }],
      lastUsedModel: null,
    }
    const result = resolveModel(disabledSettings, {
      providerId: 'test-provider',
      modelId: 'model-1',
    })
    expect(result).toBeNull()
  })
})

describe('PROVIDER_TYPE_META', () => {
  it('defines metadata for all provider types', () => {
    const types = [
      'openai',
      'azure-openai',
      'gemini',
      'claude',
      'grok',
      'ollama',
      'openai-compatible',
    ] as const
    for (const type of types) {
      expect(PROVIDER_TYPE_META[type]).toBeDefined()
      expect(PROVIDER_TYPE_META[type].displayName).toBeTruthy()
    }
  })

  it('ollama does not require API key', () => {
    expect(PROVIDER_TYPE_META.ollama.requiresApiKey).toBe(false)
  })

  it('openai requires API key', () => {
    expect(PROVIDER_TYPE_META.openai.requiresApiKey).toBe(true)
  })
})

describe('PROVIDER_MODEL_DEFAULTS', () => {
  it('provides default models for openai', () => {
    expect(PROVIDER_MODEL_DEFAULTS.openai.length).toBeGreaterThan(0)
  })

  it('provides empty defaults for ollama', () => {
    expect(PROVIDER_MODEL_DEFAULTS.ollama).toEqual([])
  })
})
