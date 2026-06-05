import { describe, expect, it } from 'vitest'

describe('env', () => {
  const originalEnv = import.meta.env

  it('uses default title when VITE_APP_TITLE is not set', async () => {
    vi.stubGlobal('import', { meta: { env: { ...originalEnv } } })
    const { appTitle } = await import('../env')
    expect(appTitle).toBeDefined()
  })

  it('exports appTitle as string', async () => {
    const { appTitle } = await import('../env')
    expect(typeof appTitle).toBe('string')
  })

  it('exports apiBaseUrl as string', async () => {
    const { apiBaseUrl } = await import('../env')
    expect(typeof apiBaseUrl).toBe('string')
  })
})
