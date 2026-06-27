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

  it('has parentImport with validation', () => {
    const pi = config.parentImport
    expect(pi?.parentModuleKey).toBe('sales-outbound')
    expect(pi?.candidateQueryType).toBe('freight-bill-import')
    expect(pi?.enforceUniqueRelation).toBe(true)
    expect(pi?.allowMultipleSelection).toBe(true)

    const validation = pi?.validateBeforeOpen?.({ carrierName: '' })
    expect(validation).toBe('请先选择物流商，再导入销售出库单')

    const noValidation = pi?.validateBeforeOpen?.({ carrierName: '物流A' })
    expect(noValidation).toBeNull()

    const validImport = pi?.validateParentImport?.({
      currentRecord: { customerName: '客户A' },
      currentItems: [],
      parentRecord: { customerName: '客户A' },
    })
    expect(validImport).toBeNull()

    const invalidImport = pi?.validateParentImport?.({
      currentRecord: { customerName: '客户A' },
      currentItems: [],
      parentRecord: { customerName: '客户B' },
    })
    expect(invalidImport).toBe('仅支持同一客户名称的销售出库单合并生成物流单')

    const noConflictWithExistingItems = pi?.validateParentImport?.({
      currentRecord: { customerName: '' },
      currentItems: [{ customerName: '客户A' }],
      parentRecord: { customerName: '客户A' },
    })
    expect(noConflictWithExistingItems).toBeNull()
  })

  it('parentImport mapParentToDraft returns default values', () => {
    const draft = config.parentImport?.mapParentToDraft?.({
      customerName: '客户A',
      projectName: '项目X',
    })
    expect(draft?.customerName).toBe('客户A')
    expect(draft?.projectName).toBe('项目X')
  })
})
