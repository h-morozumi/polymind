import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import type { LlmSettings, LlmProvider, ModelSelection } from '@shared/llm'
import { createDefaultSettings } from '@shared/llm'

export class LlmSettingsService {
  private settingsPath: string
  private settings: LlmSettings

  constructor(settingsPath: string) {
    this.settingsPath = settingsPath
    this.settings = this.load()
  }

  private load(): LlmSettings {
    try {
      const data = readFileSync(this.settingsPath, 'utf-8')
      const parsed = JSON.parse(data) as Partial<LlmSettings>
      return {
        providers: Array.isArray(parsed.providers) ? parsed.providers : [],
        lastUsedModel: parsed.lastUsedModel ?? null,
      }
    } catch {
      return createDefaultSettings()
    }
  }

  private save(): void {
    try {
      mkdirSync(dirname(this.settingsPath), { recursive: true })
      const sanitized: LlmSettings = {
        providers: this.settings.providers,
        lastUsedModel: this.settings.lastUsedModel,
      }
      writeFileSync(this.settingsPath, JSON.stringify(sanitized, null, 2), 'utf-8')
    } catch (err) {
      console.error('Failed to save LLM settings:', err)
    }
  }

  getSettings(): LlmSettings {
    return structuredClone(this.settings)
  }

  private static readonly MASKED_API_KEY = '••••••••'

  /** Returns settings without apiKey values (safe for renderer) */
  getSettingsForRenderer(): LlmSettings {
    return {
      providers: this.settings.providers.map((p) => ({
        ...p,
        apiKey: p.apiKey ? LlmSettingsService.MASKED_API_KEY : undefined,
      })),
      lastUsedModel: this.settings.lastUsedModel,
    }
  }

  saveProvider(provider: LlmProvider): void {
    const index = this.settings.providers.findIndex((p) => p.id === provider.id)
    if (index >= 0) {
      const existing = this.settings.providers[index]
      if (provider.apiKey === LlmSettingsService.MASKED_API_KEY) {
        provider = { ...provider, apiKey: existing.apiKey }
      }
      this.settings.providers[index] = provider
    } else {
      this.settings.providers.push(provider)
    }
    this.save()
  }

  deleteProvider(id: string): void {
    this.settings.providers = this.settings.providers.filter((p) => p.id !== id)
    if (this.settings.lastUsedModel && this.settings.lastUsedModel.providerId === id) {
      this.settings.lastUsedModel = null
    }
    this.save()
  }

  setLastUsedModel(selection: ModelSelection | null): void {
    this.settings.lastUsedModel = selection
    this.save()
  }
}
