import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { LlmSettingsService } from '@main/services/llm-settings'
import type { LlmProvider } from '@shared/llm'

function createTestProvider(overrides: Partial<LlmProvider> = {}): LlmProvider {
  return {
    id: 'test-1',
    name: 'Test Provider',
    type: 'openai',
    apiKey: 'sk-test-key',
    baseUrl: 'https://api.openai.com/v1',
    models: [{ id: 'gpt-4o', name: 'GPT-4o' }],
    enabled: true,
    ...overrides,
  }
}

describe('LlmSettingsService', () => {
  let tmpDir: string
  let settingsPath: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'polymind-test-'))
    settingsPath = join(tmpDir, 'llm-settings.json')
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns default settings when no file exists', () => {
    const service = new LlmSettingsService(settingsPath)
    const settings = service.getSettings()
    expect(settings.providers).toEqual([])
    expect(settings.lastUsedModel).toBeNull()
  })

  it('saves and retrieves a provider', () => {
    const service = new LlmSettingsService(settingsPath)
    const provider = createTestProvider()

    service.saveProvider(provider)

    const settings = service.getSettings()
    expect(settings.providers).toHaveLength(1)
    expect(settings.providers[0].name).toBe('Test Provider')
  })

  it('updates an existing provider', () => {
    const service = new LlmSettingsService(settingsPath)
    const provider = createTestProvider()
    service.saveProvider(provider)

    const updated = { ...provider, name: 'Updated Provider' }
    service.saveProvider(updated)

    const settings = service.getSettings()
    expect(settings.providers).toHaveLength(1)
    expect(settings.providers[0].name).toBe('Updated Provider')
  })

  it('deletes a provider', () => {
    const service = new LlmSettingsService(settingsPath)
    service.saveProvider(createTestProvider())
    service.saveProvider(createTestProvider({ id: 'test-2', name: 'Second' }))

    service.deleteProvider('test-1')

    const settings = service.getSettings()
    expect(settings.providers).toHaveLength(1)
    expect(settings.providers[0].id).toBe('test-2')
  })

  it('clears lastUsedModel when its provider is deleted', () => {
    const service = new LlmSettingsService(settingsPath)
    service.saveProvider(createTestProvider())
    service.setLastUsedModel({ providerId: 'test-1', modelId: 'gpt-4o' })

    service.deleteProvider('test-1')

    const settings = service.getSettings()
    expect(settings.lastUsedModel).toBeNull()
  })

  it('sets and retrieves lastUsedModel', () => {
    const service = new LlmSettingsService(settingsPath)
    service.saveProvider(createTestProvider())

    service.setLastUsedModel({ providerId: 'test-1', modelId: 'gpt-4o' })

    const settings = service.getSettings()
    expect(settings.lastUsedModel).toEqual({ providerId: 'test-1', modelId: 'gpt-4o' })
  })

  it('persists settings to JSON file', () => {
    const service = new LlmSettingsService(settingsPath)
    service.saveProvider(createTestProvider())

    const raw = readFileSync(settingsPath, 'utf-8')
    const parsed = JSON.parse(raw)
    expect(parsed.providers).toHaveLength(1)
    expect(parsed.providers[0].id).toBe('test-1')
  })

  it('loads persisted settings on restart', () => {
    const service1 = new LlmSettingsService(settingsPath)
    service1.saveProvider(createTestProvider())
    service1.setLastUsedModel({ providerId: 'test-1', modelId: 'gpt-4o' })

    const service2 = new LlmSettingsService(settingsPath)
    const settings = service2.getSettings()
    expect(settings.providers).toHaveLength(1)
    expect(settings.lastUsedModel).toEqual({ providerId: 'test-1', modelId: 'gpt-4o' })
  })

  it('masks apiKey in renderer settings', () => {
    const service = new LlmSettingsService(settingsPath)
    service.saveProvider(createTestProvider())

    const rendererSettings = service.getSettingsForRenderer()
    expect(rendererSettings.providers[0].apiKey).toBe('••••••••')
  })

  it('returns deep clone from getSettings', () => {
    const service = new LlmSettingsService(settingsPath)
    service.saveProvider(createTestProvider())

    const settings1 = service.getSettings()
    settings1.providers[0].name = 'Mutated'

    const settings2 = service.getSettings()
    expect(settings2.providers[0].name).toBe('Test Provider')
  })
})
