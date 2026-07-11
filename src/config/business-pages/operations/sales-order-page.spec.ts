import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  buildValueOptions: (...args: string[]) =>
    args.map((v) => ({ label: v, value: v })),
  getCustomerOptions: [],
  getCustomerProjectOptions: [],
  getSettlementCompanyOptions: [],
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
    expect(
      salesOrdersPageConfig.filters!.map((filter) => filter.key),
    ).toContain('settlementCompanyId')
    const statusFilter = salesOrdersPageConfig.filters!.find(
      (filter) => filter.key === 'status',
    )
    expect(statusFilter?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '交付核定' }),
      ]),
    )
  })

  it('does not force customer and project into manual rows', () => {
    const customerFilter = salesOrdersPageConfig.filters!.find(
      (filter) => filter.key === 'customerName',
    )
    const projectFilter = salesOrdersPageConfig.filters!.find(
      (filter) => filter.key === 'projectName',
    )

    expect(customerFilter?.row).toBeUndefined()
    expect(projectFilter?.row).toBeUndefined()
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
    expect(
      salesOrdersPageConfig.parentImport!.buildParentFilters?.({ id: '1' }),
    ).toEqual({ status: '已审核' })
    expect(
      salesOrdersPageConfig.parentImport!.hiddenSelectorColumnKeys,
    ).toContain('status')
  })

  it('maps parent purchase order number into a sales order draft', () => {
    const parentImport = salesOrdersPageConfig.parentImport!

    expect(parentImport.mapParentToDraft?.({ orderNo: 'PO-001' })).toEqual({
      purchaseOrderNo: 'PO-001',
    })
    expect(parentImport.mapParentToDraft?.({})).toEqual({
      purchaseOrderNo: '',
    })
  })

  it('transforms items with explicit remaining sales weight', () => {
    const items = salesOrdersPageConfig.parentImport!.transformItems?.({
      items: [
        {
          id: 'item-1',
          salesRemainingQuantity: '2',
          quantity: 5,
          weightTon: 9.876543219,
          salesRemainingWeightTon: '1.234567899',
          pieceWeightTon: '0.6',
          unitPrice: 100,
        },
      ],
    })

    expect(items).toHaveLength(1)
    expect(items?.[0]).toMatchObject({
      sourcePurchaseOrderItemId: 'item-1',
      pieceWeightTon: 0.6,
      remainingQuantity: 2,
      remainingWeightTon: 1.2345679,
      remainingAmount: 123.46,
      _sourceTotalQuantity: 5,
      _sourceTotalWeightTon: 9.876543219,
      _sourcePieceWeightTon: '0.6',
    })
    expect(items?.[0].id).toContain('sales-order-item')
  })

  it('uses parent total weight when all quantity remains available', () => {
    const items = salesOrdersPageConfig.parentImport!.transformItems?.({
      items: [
        {
          id: 'item-2',
          remainingQuantity: 3,
          quantity: 3,
          weightTon: '12.345678999',
          pieceWeightTon: 0.8,
        },
      ],
    })

    expect(items).toHaveLength(1)
    expect(items?.[0]).toMatchObject({
      sourcePurchaseOrderItemId: 'item-2',
      remainingQuantity: 3,
      remainingWeightTon: 12.345679,
      remainingAmount: 0,
    })
  })

  it('derives remaining weight from quantity and piece weight when needed', () => {
    const items = salesOrdersPageConfig.parentImport!.transformItems?.({
      items: [
        {
          id: 'item-3',
          remainingQuantity: 2,
          quantity: 5,
          weightTon: 10,
          pieceWeightTon: 0.75,
          unitPrice: 20,
        },
        {
          id: 'item-4',
          quantity: 4,
          weightTon: 0,
          pieceWeightTon: 0.25,
          unitPrice: 10,
        },
      ],
    })

    expect(items?.[0]).toMatchObject({
      sourcePurchaseOrderItemId: 'item-3',
      remainingQuantity: 2,
      remainingWeightTon: 1.5,
      remainingAmount: 30,
    })
    expect(items?.[1]).toMatchObject({
      sourcePurchaseOrderItemId: 'item-4',
      remainingQuantity: 4,
      remainingWeightTon: 1,
      remainingAmount: 10,
    })
  })

  it('falls back to zeroes for invalid item numbers and missing items', () => {
    const items = salesOrdersPageConfig.parentImport!.transformItems?.({
      items: [
        {
          id: 'item-5',
          salesRemainingQuantity: 'invalid',
          pieceWeightTon: 'invalid',
          unitPrice: 'invalid',
        },
        {
          id: 'item-6',
        },
      ],
    })

    expect(items?.[0]).toMatchObject({
      sourcePurchaseOrderItemId: 'item-5',
      pieceWeightTon: 0,
      remainingQuantity: 0,
      remainingWeightTon: 0,
      remainingAmount: 0,
    })
    expect(items?.[1]).toMatchObject({
      sourcePurchaseOrderItemId: 'item-6',
      pieceWeightTon: 0,
      remainingQuantity: 0,
      remainingWeightTon: 0,
      remainingAmount: 0,
    })
    expect(salesOrdersPageConfig.parentImport!.transformItems?.({})).toEqual([])
    expect(
      salesOrdersPageConfig.parentImport!.transformItems?.({
        items: 'invalid',
      }),
    ).toEqual([])
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

  it('renders totalWeight when row items are missing', () => {
    const totalWeightColumn = salesOrdersPageConfig.columns.find(
      (column) => column.dataIndex === 'totalWeight',
    )

    expect(totalWeightColumn?.render?.(3, {})).toBe('3')
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

  it('renders warning tooltip when original total weight is zero', () => {
    const totalWeightColumn = salesOrdersPageConfig.columns.find(
      (column) => column.dataIndex === 'totalWeight',
    )

    const rendered = totalWeightColumn?.render?.(1, {
      items: [{ originalWeightTon: 0, weightTon: 1 }],
    })

    expect(rendered).toMatchObject({
      props: {
        title: '原始计划 0 吨',
        children: '1 ⚠️',
      },
    })
  })
})
