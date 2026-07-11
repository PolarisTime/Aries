import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  enabledStatusOptions: [],
}))

import { masterWarehousePageConfigs } from './master-warehouse-pages'

describe('masterWarehousePageConfigs', () => {
  it('contains warehouse config', () => {
    expect(masterWarehousePageConfigs.warehouse).toBeDefined()
    expect(masterWarehousePageConfigs.warehouse.key).toBe('warehouse')
  })

  it('has primaryNoKey', () => {
    expect(masterWarehousePageConfigs.warehouse.primaryNoKey).toBe(
      'warehouseCode',
    )
  })

  it('has filters', () => {
    expect(masterWarehousePageConfigs.warehouse.filters).toBeDefined()
    expect(
      masterWarehousePageConfigs.warehouse.filters!.length,
    ).toBeGreaterThanOrEqual(3)
  })

  it('has columns', () => {
    expect(masterWarehousePageConfigs.warehouse.columns).toBeDefined()
    expect(masterWarehousePageConfigs.warehouse.columns.length).toBeGreaterThan(
      0,
    )
  })

  it('keeps warehouse identity visible and hides address details by default', () => {
    const config = masterWarehousePageConfigs.warehouse
    const columnKeys = config.columns.map((column) => column.dataIndex)
    const hiddenKeys = config.defaultHiddenColumnKeys ?? []
    const visibleKeys = columnKeys.filter((key) => !hiddenKeys.includes(key))

    expect(hiddenKeys).toEqual(['contactPhone', 'address', 'remark'])
    expect(columnKeys).toEqual(expect.arrayContaining(hiddenKeys))
    expect(visibleKeys).toEqual(
      expect.arrayContaining([
        'warehouseCode',
        'warehouseName',
        'warehouseType',
        'contactName',
        'status',
      ]),
    )
    expect(hiddenKeys.length).toBeLessThan(columnKeys.length * 0.6)
  })

  it('has formFields', () => {
    expect(masterWarehousePageConfigs.warehouse.formFields).toBeDefined()
  })

  it('buildOverview returns result', () => {
    const result = masterWarehousePageConfigs.warehouse.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })
})
