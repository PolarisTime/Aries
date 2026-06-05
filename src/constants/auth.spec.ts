import { describe, expect, it } from 'vitest'
import { AUTH_STATE_CHANGED_EVENT } from './auth'

describe('AUTH_STATE_CHANGED_EVENT', () => {
  it('exports the correct event name', () => {
    expect(AUTH_STATE_CHANGED_EVENT).toBe('aries-auth-state-changed')
  })

  it('is a string', () => {
    expect(typeof AUTH_STATE_CHANGED_EVENT).toBe('string')
  })
})
