import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  buildValueOptions: (...args: string[]) =>
    args.map((v) => ({ label: v, value: v })),
  getCustomerOptions: [],
  getCustomerProjectOptions: [],
}))

import { salesOrdersPageConfig } from './sales-order-page'

describe('salesOrdersPageConfig', () => {
  it('has correct key', () => {
    expect(salesOrdersPageConfig.key).toBe('sales-order')
  })

  it('has primaryNoKey', () => {
    expect(salesOrdersPageConfig.primaryNoKey).toBe('orderNo')
  })

  it('has filters', () => {
    expect(salesOrdersPageConfig.filters).toBeDefined()
    expect(salesOrdersPageConfig.filters!.length).toBeGreaterThanOrEqual(6)
  })

  it('has columns', () => {
    expect(salesOrdersPageConfig.columns).toBeDefined()
    expect(salesOrdersPageConfig.columns.length).toBeGreaterThan(0)
  })

  it('has parentImport config', () => {
    expect(salesOrdersPageConfig.parentImport).toBeDefined()
    expect(salesOrdersPageConfig.parentImport!.parentModuleKey).toBe(
      'purchase-order',
    )
    expect(salesOrdersPageConfig.parentImport!.candidateQueryType).toBe(
      'purchase-order-import',
    )
    expect(salesOrdersPageConfig.parentImport!.candidateUsage).toBe(
      'sales-order',
    )
  })

  it('buildOverview returns result', () => {
    const result = salesOrdersPageConfig.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
  })

  it('has defaultHiddenColumnKeys', () => {
    expect(salesOrdersPageConfig.defaultHiddenColumnKeys).toBeDefined()
  })

  it('renders totalWeight for unchanged sales order rows', () => {
    const totalWeightColumn = salesOrdersPageConfig.columns.find(
      (column) => column.dataIndex === 'totalWeight',
    )

    expect(totalWeightColumn?.render?.(12.5, { items: [] })).toBe('12.5')
  })

  it('renders fallback for invalid totalWeight values', () => {
    const totalWeightColumn = salesOrdersPageConfig.columns.find(
      (column) => column.dataIndex === 'totalWeight',
    )

    expect(totalWeightColumn?.render?.(undefined, { items: [] })).toBe('-')
  })

  it('renders warning tooltip for overwritten totalWeight rows', () => {
    const totalWeightColumn = salesOrdersPageConfig.columns.find(
      (column) => column.dataIndex === 'totalWeight',
    )

    const rendered = totalWeightColumn?.render?.(8, {
      items: [{ originalWeightTon: 10, weightTon: 8 }],
    })

    expect(rendered).toMatchObject({
      props: {
        title: '原始计划 10 吨',
        children: '8 ⚠️',
      },
    })
  })
})
