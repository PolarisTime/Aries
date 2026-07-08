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

  it('exports configured frontend build metadata', async () => {
    vi.stubGlobal('__APP_BUILD_TIME__', '2026-07-08 18:10:11')
    vi.stubGlobal('__APP_COMMIT__', '123abcdef0')

    const { frontendBuildTime, frontendGitCommit } = await import('../env')

    expect(frontendBuildTime).toBe('2026-07-08 18:10:11')
    expect(frontendGitCommit).toBe('123abcde')
  })

  it('falls back to default frontend version', async () => {
    vi.stubGlobal('__APP_VERSION__', undefined)

    const { frontendVersion } = await import('../env')

    expect(frontendVersion).toBe('0.0.0')
  })

  it('falls back to unknown frontend build metadata', async () => {
    vi.stubGlobal('__APP_BUILD_TIME__', undefined)
    vi.stubGlobal('__APP_COMMIT__', undefined)

    const { frontendBuildTime, frontendGitCommit } = await import('../env')

    expect(frontendBuildTime).toBe('unknown')
    expect(frontendGitCommit).toBe('unknown')
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
