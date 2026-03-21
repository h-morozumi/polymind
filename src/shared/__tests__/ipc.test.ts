import { describe, it, expect } from 'vitest'
import { IpcChannels } from '@shared/ipc'
import type { IpcResult } from '@shared/ipc'

describe('IpcChannels', () => {
  it('defines PING channel', () => {
    expect(IpcChannels.PING).toBe('ping')
  })

  it('defines LLM settings channels', () => {
    expect(IpcChannels.LLM_GET_SETTINGS).toBe('llm:get-settings')
    expect(IpcChannels.LLM_SAVE_PROVIDER).toBe('llm:save-provider')
    expect(IpcChannels.LLM_DELETE_PROVIDER).toBe('llm:delete-provider')
    expect(IpcChannels.LLM_SET_LAST_USED).toBe('llm:set-last-used')
  })
})

describe('IpcResult', () => {
  it('represents a successful result', () => {
    const result: IpcResult<string> = { success: true, data: 'pong' }
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('pong')
    }
  })

  it('represents a failure result with error code', () => {
    const result: IpcResult<string> = { success: false, error: 'Not found', code: 'NOT_FOUND' }
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Not found')
      expect(result.code).toBe('NOT_FOUND')
    }
  })
})
