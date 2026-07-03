import { afterEach, describe, expect, it, vi } from 'vitest'

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('uses configured app title', async () => {
    vi.stubEnv('VITE_APP_TITLE', 'Aries ERP')

    const { appTitle } = await import('../env')

    expect(appTitle).toBe('Aries ERP')
  })

  it('uses default title when VITE_APP_TITLE is not set', async () => {
    vi.stubEnv('VITE_APP_TITLE', '')

    const { appTitle } = await import('../env')

    expect(appTitle).toBe('Leo ERP')
  })

  it('exports configured frontend version', async () => {
    vi.stubGlobal('__APP_VERSION__', '1.2.3')

    const { frontendVersion } = await import('../env')

    expect(frontendVersion).toBe('1.2.3')
  })

  it('falls back to default frontend version', async () => {
    vi.stubGlobal('__APP_VERSION__', undefined)

    const { frontendVersion } = await import('../env')

    expect(frontendVersion).toBe('0.0.0')
  })

  it('combines api base and version when version is configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/backend')
    vi.stubEnv('VITE_API_VERSION', 'v1')

    const { apiBaseUrl } = await import('../env')

    expect(apiBaseUrl).toBe('/backend/v1')
  })

  it('uses api base without version by default', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.stubEnv('VITE_API_VERSION', '')

    const { apiBaseUrl } = await import('../env')

    expect(apiBaseUrl).toBe('/api')
  })
})
