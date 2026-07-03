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

  it('general-setting buildOverview counts enabled rules', () => {
    const result = systemCorePageConfigs['general-setting'].buildOverview!([
      { id: '1', status: '正常' },
      { id: '2', status: '禁用' },
    ])

    expect(result).toEqual([
      {
        label: 'modules.pages.systemCore.ruleCount',
        value: '2',
      },
      {
        label: 'modules.pages.systemCore.enabledRuleCount',
        value: '1',
      },
    ])
  })

  it('does not contain settlement company config', () => {
    expect(systemCorePageConfigs['company-setting']).toBeUndefined()
  })
})
