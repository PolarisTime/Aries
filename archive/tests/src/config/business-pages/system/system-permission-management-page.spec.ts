import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
  userAccountDataScopeOptions: [],
}))

import { permissionManagementPageConfig } from './system-permission-management-page'

describe('permissionManagementPageConfig', () => {
  it('has correct key', () => {
    expect(permissionManagementPageConfig.key).toBe('permission')
  })

  it('is readOnly', () => {
    expect(permissionManagementPageConfig.readOnly).toBe(true)
  })

  it('identifies export actions by a locale-independent key', () => {
    expect(permissionManagementPageConfig.actions).toEqual([
      expect.objectContaining({ key: 'export' }),
    ])
  })

  it('has filters', () => {
    expect(permissionManagementPageConfig.filters).toBeDefined()
    expect(
      permissionManagementPageConfig.filters!.length,
    ).toBeGreaterThanOrEqual(2)
  })

  it('has columns', () => {
    expect(permissionManagementPageConfig.columns).toBeDefined()
    expect(permissionManagementPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has detailFields', () => {
    expect(permissionManagementPageConfig.detailFields).toBeDefined()
  })

  it('has formFields', () => {
    expect(permissionManagementPageConfig.formFields).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = permissionManagementPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
