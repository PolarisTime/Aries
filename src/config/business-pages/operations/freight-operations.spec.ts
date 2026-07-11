import { describe, expect, it } from 'vitest'
import { freightOperationsPageConfigs } from './freight-operations'

describe('freightOperationsPageConfigs', () => {
  const config = freightOperationsPageConfigs['freight-bill']

  it('has required top-level fields', () => {
    expect(config.key).toBe('freight-bill')
    expect(config.title).toBeTruthy()
    expect(config.primaryNoKey).toBe('billNo')
    expect(Array.isArray(config.actions)).toBe(true)
    expect(config.actions).toHaveLength(2)
    expect(Array.isArray(config.filters)).toBe(true)
    expect(Array.isArray(config.columns)).toBe(true)
    expect(Array.isArray(config.detailFields)).toBe(true)
    expect(Array.isArray(config.formFields)).toBe(true)
    expect(config.buildOverview).toBeTypeOf('function')
  })

  it('shows audit status in list columns', () => {
    const statusColumn = config.columns.find(
      (column) => column.dataIndex === 'status',
    )

    expect(statusColumn).toMatchObject({
      type: 'status',
      align: 'center',
      width: 110,
    })
    expect(config.columns.map((column) => column.dataIndex)).toContain('status')
  })

  it('keeps operational filters visible and moves secondary filters to row two', () => {
    const primaryFilterKeys = ['keyword', 'carrierName', 'status']
    const secondaryFilterKeys = ['settlementCompanyId', 'billTime']

    expect(
      config
        .filters!.filter((filter) => filter.row == null)
        .map((filter) => filter.key),
    ).toEqual(primaryFilterKeys)
    for (const key of primaryFilterKeys) {
      expect(
        config.filters!.find((filter) => filter.key === key)?.row,
      ).toBeUndefined()
    }
    expect(
      config
        .filters!.filter((filter) => filter.row === 2)
        .map((filter) => filter.key),
    ).toEqual(secondaryFilterKeys)
    for (const key of secondaryFilterKeys) {
      expect(config.filters!.find((filter) => filter.key === key)?.row).toBe(2)
    }
  })

  it('shows source outbound and vehicle while keeping party context optional', () => {
    const columnKeys = config.columns.map((column) => column.dataIndex)

    expect(columnKeys).toEqual(
      expect.arrayContaining([
        'outboundNo',
        'vehiclePlate',
        'customerName',
        'projectName',
        'settlementCompanyName',
      ]),
    )
    expect(config.defaultHiddenColumnKeys).not.toContain('outboundNo')
    expect(config.defaultHiddenColumnKeys).not.toContain('vehiclePlate')
    expect(config.defaultHiddenColumnKeys).toEqual([
      'carrierCode',
      'customerName',
      'projectName',
      'settlementCompanyName',
      'unitPrice',
      'remark',
    ])
  })

  it('snapshots the stable carrier code across list, detail and editor config', () => {
    expect(config.columns.map((column) => column.dataIndex)).toContain(
      'carrierCode',
    )
    expect(config.detailFields.map((field) => field.key)).toContain(
      'carrierCode',
    )
    expect(
      config.formFields.find((field) => field.key === 'carrierCode'),
    ).toMatchObject({
      type: 'input',
      disabled: true,
    })
    expect(config.saveFields?.scalar).toContain('carrierCode')
  })

  it('has parentImport configuration', () => {
    const pi = config.parentImport
    expect(pi?.parentModuleKey).toBe('sales-outbound')
    expect(pi?.candidateQueryType).toBe('freight-bill-import')
    expect(pi?.enforceUniqueRelation).toBe(true)
    expect(pi?.allowMultipleSelection).toBe(true)
    expect(pi?.buildParentFilters?.({ id: '1' })).toEqual({
      status: '已审核',
    })
    expect(pi?.hiddenSelectorColumnKeys).toContain('status')

    const validation = pi?.validateBeforeOpen?.({ carrierName: '' })
    expect(validation).toBe('请先选择物流商，再导入销售出库单')

    const noValidation = pi?.validateBeforeOpen?.({ carrierName: '物流A' })
    expect(noValidation).toBeNull()
  })

  it('allows merging sales outbounds from arbitrary customers', () => {
    expect(config.parentImport?.allowMultipleSelection).toBe(true)
    expect(config.parentImport?.validateParentImport).toBeUndefined()
  })

  it('parentImport mapParentToDraft returns default values', () => {
    const draft = config.parentImport?.mapParentToDraft?.({
      customerName: '客户A',
      projectName: '项目X',
    })
    expect(draft?.customerName).toBe('客户A')
    expect(draft?.projectName).toBe('项目X')
  })

  it('parentImport mapParentToDraft fills empty defaults', () => {
    const draft = config.parentImport?.mapParentToDraft?.({})
    expect(draft).toEqual({
      customerName: '',
      projectName: '',
    })
  })

  it('builds freight overview', () => {
    const overview = config.buildOverview?.([
      { totalFreight: 100, totalWeight: 2 },
      { totalFreight: 50, totalWeight: 3 },
    ])

    expect(overview).toBeDefined()
    expect(overview?.length).toBeGreaterThan(0)
  })
})
