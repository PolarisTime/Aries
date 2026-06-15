import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
}))

import { systemCorePageConfigs } from './system-core-pages'

describe('systemCorePageConfigs', () => {
  it('contains general-setting config', () => {
    expect(systemCorePageConfigs['general-setting']).toBeDefined()
    expect(systemCorePageConfigs['general-setting'].key).toBe('general-setting')
  })

  it('contains company-setting config', () => {
    expect(systemCorePageConfigs['company-setting']).toBeDefined()
    expect(systemCorePageConfigs['company-setting'].key).toBe('company-setting')
  })

  it('general-setting has filters', () => {
    expect(systemCorePageConfigs['general-setting'].filters).toBeDefined()
    expect(
      systemCorePageConfigs['general-setting'].filters!.length,
    ).toBeGreaterThanOrEqual(2)
  })

  it('general-setting has columns', () => {
    expect(systemCorePageConfigs['general-setting'].columns).toBeDefined()
    expect(
      systemCorePageConfigs['general-setting'].columns.length,
    ).toBeGreaterThan(0)
  })

  it('general-setting has formFields', () => {
    expect(systemCorePageConfigs['general-setting'].formFields).toBeDefined()
  })

  it('general-setting buildOverview returns result', () => {
    const result = systemCorePageConfigs['general-setting'].buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(2)
  })

  it('company-setting has columns', () => {
    expect(systemCorePageConfigs['company-setting'].columns).toBeDefined()
    expect(
      systemCorePageConfigs['company-setting'].columns.length,
    ).toBeGreaterThan(0)
  })

  it('company-setting has formFields', () => {
    expect(systemCorePageConfigs['company-setting'].formFields).toBeDefined()
  })
})
