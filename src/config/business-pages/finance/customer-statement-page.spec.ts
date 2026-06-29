import { describe, expect, it } from 'vitest'
import { customerStatementPageConfig } from './customer-statement-page'

describe('customerStatementPageConfig', () => {
  const pi = customerStatementPageConfig.parentImport!

  it('has required config fields', () => {
    expect(customerStatementPageConfig.key).toBe('customer-statement')
    expect(customerStatementPageConfig.title).toBeTruthy()
    expect(customerStatementPageConfig.primaryNoKey).toBe('statementNo')
    expect(Array.isArray(customerStatementPageConfig.actions)).toBe(true)
    expect(Array.isArray(customerStatementPageConfig.filters)).toBe(true)
    expect(Array.isArray(customerStatementPageConfig.columns)).toBe(true)
    expect(
      customerStatementPageConfig.columns.map((column) => column.dataIndex),
    ).toContain('customerCode')
    expect(
      customerStatementPageConfig.detailFields.map((field) => field.key),
    ).toContain('customerCode')
    expect(customerStatementPageConfig.saveFields?.scalar).toContain(
      'customerCode',
    )
    expect(customerStatementPageConfig.buildOverview).toBeTypeOf('function')
  })

  it('buildOverview returns results', () => {
    const overview = customerStatementPageConfig.buildOverview([])
    expect(Array.isArray(overview)).toBe(true)
  })

  describe('parentImport', () => {
    it('buildParentFilters filters by customer and project', () => {
      const filters = pi.buildParentFilters!({
        customerName: ' 客户A ',
        projectName: ' 项目X ',
        settlementCompanyId: 8,
      } as any)
      expect(filters).toEqual({
        customerName: '客户A',
        projectName: '项目X',
        settlementCompanyId: 8,
        status: '完成销售',
      })
    })

    it('buildParentFilters handles empty values', () => {
      const filters = pi.buildParentFilters!({
        customerName: '',
        projectName: undefined,
      } as any)
      expect(filters).toEqual({
        customerName: '',
        projectName: '',
        settlementCompanyId: undefined,
        status: '完成销售',
      })
    })

    it('validateBeforeOpen returns null when customerName is present', () => {
      expect(
        pi.validateBeforeOpen!({ customerName: '客户A' } as any),
      ).toBeNull()
    })

    it('validateBeforeOpen returns error when customerName is empty', () => {
      expect(pi.validateBeforeOpen!({ customerName: '' } as any)).toBe(
        '请先选择客户，再选择销售订单',
      )
    })

    it('validateBeforeOpen returns error when customerName is only whitespace', () => {
      expect(pi.validateBeforeOpen!({ customerName: '  ' } as any)).toBe(
        '请先选择客户，再选择销售订单',
      )
    })

    it('mapParentToDraft maps fields from parent record', () => {
      const draft = pi.mapParentToDraft!({
        customerName: '客户A',
        projectName: '项目X',
        deliveryDate: '2024-01-15',
        settlementCompanyId: 8,
        settlementCompanyName: '主体B',
      } as any)
      expect(draft).toEqual({
        customerName: '客户A',
        projectName: '项目X',
        settlementCompanyId: 8,
        settlementCompanyName: '主体B',
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        receiptAmount: 0,
        status: '待确认',
      })
    })

    it('mapParentToDraft handles missing optional fields', () => {
      const draft = pi.mapParentToDraft!({} as any)
      expect(draft.customerName).toBe('')
      expect(draft.projectName).toBe('')
      expect(draft.startDate).toBe('')
      expect(draft.endDate).toBe('')
    })

    it('validateParentImport passes when status matches and customer matches', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerName: '客户A' },
        currentItems: [],
        parentRecord: { status: '完成销售', customerName: '客户A' },
      } as any)
      expect(result).toBeNull()
    })

    it('validateParentImport rejects non-完成销售 status', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerName: '客户A' },
        currentItems: [],
        parentRecord: { status: '待审核', customerName: '客户A' },
      } as any)
      expect(result).toBe('只能选择完成销售的销售订单生成客户对账单')
    })

    it('validateParentImport rejects mismatched customer', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerName: '客户A' },
        currentItems: [],
        parentRecord: { status: '完成销售', customerName: '客户B' },
      } as any)
      expect(result).toBe('只能选择同一客户的销售订单生成客户对账单')
    })

    it('validateParentImport rejects mismatched project', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerName: '客户A', projectName: '项目Y' },
        currentItems: [{ projectName: '项目Y' }, { projectName: '项目Z' }],
        parentRecord: {
          status: '完成销售',
          customerName: '客户A',
          projectName: '项目X',
        },
      } as any)
      expect(result).toBe('只能选择同一项目的销售订单生成客户对账单')
    })

    it('validateParentImport rejects mismatched settlement company', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerName: '客户A', settlementCompanyId: 1 },
        currentItems: [],
        parentRecord: {
          status: '完成销售',
          customerName: '客户A',
          settlementCompanyId: 2,
        },
      } as any)
      expect(result).toBe('只能选择同一结算主体的销售订单生成客户对账单')
    })

    it('validateParentImport allows empty current project context', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerName: '客户A', projectName: '' },
        currentItems: [],
        parentRecord: {
          status: '完成销售',
          customerName: '客户A',
          projectName: '项目X',
        },
      } as any)
      expect(result).toBeNull()
    })

    it('validateParentImport matches project when currentItems have multiple projects', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerName: '客户A', projectName: ' 项目X ' },
        currentItems: [{ projectName: '项目X' }],
        parentRecord: {
          status: '完成销售',
          customerName: '客户A',
          projectName: '项目X',
        },
      } as any)
      expect(result).toBeNull()
    })

    it('transformItems maps items from parent record', () => {
      const items = pi.transformItems!({
        orderNo: 'SO-2024-001',
        items: [
          { id: 1, materialName: '螺纹钢', quantity: 10 },
          { id: 2, materialName: '盘螺', quantity: 5 },
        ],
      } as any)
      expect(items).toHaveLength(2)
      expect(items[0].id).toBe('SO-2024-001-1')
      expect(items[0].sourceNo).toBe('SO-2024-001')
      expect(items[1].sourceNo).toBe('SO-2024-001')
    })

    it('transformItems handles missing orderNo', () => {
      const items = pi.transformItems!({
        items: [{ id: 1, materialName: '螺纹钢' }],
      } as any)
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('sales-order-1')
    })

    it('transformItems handles non-array items', () => {
      const items = pi.transformItems!({} as any)
      expect(items).toEqual([])
    })
  })
})
