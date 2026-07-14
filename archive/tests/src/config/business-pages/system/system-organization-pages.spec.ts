import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
}))

import { systemOrganizationPageConfigs } from './system-organization-pages'

describe('systemOrganizationPageConfigs', () => {
  it('contains department config', () => {
    expect(systemOrganizationPageConfigs.department).toBeDefined()
    expect(systemOrganizationPageConfigs.department.key).toBe('department')
  })

  it('has primaryNoKey', () => {
    expect(systemOrganizationPageConfigs.department.primaryNoKey).toBe(
      'departmentCode',
    )
  })

  it('has filters', () => {
    expect(systemOrganizationPageConfigs.department.filters).toBeDefined()
    expect(
      systemOrganizationPageConfigs.department.filters!.length,
    ).toBeGreaterThanOrEqual(2)
  })

  it('has columns', () => {
    expect(systemOrganizationPageConfigs.department.columns).toBeDefined()
    expect(
      systemOrganizationPageConfigs.department.columns.length,
    ).toBeGreaterThan(0)
  })

  it('keeps department hierarchy visible and hides administrative details by default', () => {
    const config = systemOrganizationPageConfigs.department
    const columnKeys = config.columns.map((column) => column.dataIndex)
    const hiddenKeys = config.defaultHiddenColumnKeys ?? []
    const visibleKeys = columnKeys.filter((key) => !hiddenKeys.includes(key))

    expect(hiddenKeys).toEqual(['contactPhone', 'sortOrder', 'remark'])
    expect(columnKeys).toEqual(expect.arrayContaining(hiddenKeys))
    expect(visibleKeys).toEqual(
      expect.arrayContaining([
        'departmentCode',
        'departmentName',
        'parentName',
        'managerName',
        'status',
      ]),
    )
    expect(hiddenKeys.length).toBeLessThan(columnKeys.length * 0.6)
  })

  it('has formFields', () => {
    expect(systemOrganizationPageConfigs.department.formFields).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = systemOrganizationPageConfigs.department.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
