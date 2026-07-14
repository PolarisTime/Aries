import { describe, expect, it, vi } from 'vitest'
import { getApiMessage } from '../api-messages'

vi.mock('i18next', () => ({
  default: {
    t: (key: string) => `translated:${key}`,
  },
  t: (key: string) => `translated:${key}`,
}))

describe('getApiMessage', () => {
  it('returns translated API message', () => {
    const result = getApiMessage('success')
    expect(result).toBe('translated:api.success')
  })

  it('passes through nested key', () => {
    const result = getApiMessage('error.network')
    expect(result).toBe('translated:api.error.network')
  })
})
