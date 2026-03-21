import { describe, it, expect } from 'vitest'
import { IpcChannels } from '@shared/ipc'

describe('IpcChannels', () => {
  it('defines PING channel', () => {
    expect(IpcChannels.PING).toBe('ping')
  })
})
