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
    expect(customerStatementPageConfig.saveFields?.scalar).toEqual(
      expect.arrayContaining(['customerId', 'projectId']),
    )
    expect(customerStatementPageConfig.saveFields?.lineItem).toEqual(
      expect.arrayContaining([
        'sourceSalesOrderItemId',
        'customerId',
        'projectId',
        'materialId',
        'warehouseId',
      ]),
    )
    expect(
      customerStatementPageConfig.filters.map((filter) => filter.key),
    ).toEqual(expect.arrayContaining(['customerId', 'projectId']))
    expect(
      customerStatementPageConfig.formFields?.map((field) => field.key),
    ).toEqual(expect.arrayContaining(['customerId', 'projectId']))
    expect(customerStatementPageConfig.buildOverview).toBeTypeOf('function')
  })

  it('buildOverview returns results', () => {
    const overview = customerStatementPageConfig.buildOverview([])
    expect(Array.isArray(overview)).toBe(true)
  })

  it('shows the reconciliation columns in business order by default', () => {
    const hiddenColumnKeys = new Set(
      customerStatementPageConfig.defaultHiddenColumnKeys,
    )
    const visibleColumnKeys = customerStatementPageConfig.columns
      .map((column) => column.dataIndex)
      .filter((key) => !hiddenColumnKeys.has(key))

    expect(hiddenColumnKeys).toContain('customerCode')
    expect(visibleColumnKeys).toEqual([
      'statementNo',
      'customerName',
      'projectName',
      'settlementCompanyName',
      'startDate',
      'endDate',
      'salesAmount',
      'receiptAmount',
      'closingAmount',
      'status',
    ])
  })

  describe('parentImport', () => {
    it('buildParentFilters filters by stable customer and project ids', () => {
      const filters = pi.buildParentFilters!({
        id: '700520000000000099',
        customerId: '700520000000000001',
        projectId: '700520000000000002',
        customerName: '过期客户名称',
        projectName: '过期项目名称',
        settlementCompanyId: '700520000000000008',
      } as any)
      expect(filters).toEqual({
        customerId: '700520000000000001',
        projectId: '700520000000000002',
        currentRecordId: '700520000000000099',
        settlementCompanyId: '700520000000000008',
        status: '完成销售',
      })
    })

    it('buildParentFilters handles empty values', () => {
      const filters = pi.buildParentFilters!({
        customerName: '',
        projectName: undefined,
      } as any)
      expect(filters).toEqual({
        customerId: undefined,
        projectId: undefined,
        currentRecordId: undefined,
        settlementCompanyId: undefined,
        status: '完成销售',
      })
    })

    it('validateBeforeOpen returns null when customerId is present', () => {
      expect(
        pi.validateBeforeOpen!({ customerId: '700520000000000001' } as any),
      ).toBeNull()
    })

    it('validateBeforeOpen returns error when customerId is empty', () => {
      expect(pi.validateBeforeOpen!({ customerId: '' } as any)).toBe(
        '请先选择客户，再选择销售订单',
      )
    })

    it('validateBeforeOpen does not infer identity from a customer name', () => {
      expect(pi.validateBeforeOpen!({ customerName: '客户A' } as any)).toBe(
        '请先选择客户，再选择销售订单',
      )
    })

    it('mapParentToDraft maps fields from parent record', () => {
      const draft = pi.mapParentToDraft!({
        customerId: '700520000000000001',
        customerCode: 'CUS-001',
        customerName: '客户A',
        projectId: '700520000000000002',
        projectName: '项目X',
        deliveryDate: '2024-01-15',
        settlementCompanyId: 8,
        settlementCompanyName: '主体B',
      } as any)
      expect(draft).toEqual({
        customerId: '700520000000000001',
        customerCode: 'CUS-001',
        customerName: '客户A',
        projectId: '700520000000000002',
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
      expect(draft.customerId).toBeUndefined()
      expect(draft.customerCode).toBe('')
      expect(draft.customerName).toBe('')
      expect(draft.projectId).toBeUndefined()
      expect(draft.projectName).toBe('')
      expect(draft.startDate).toBe('')
      expect(draft.endDate).toBe('')
    })

    it('validateParentImport passes when status matches and customer matches', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerId: '700520000000000001' },
        currentItems: [],
        parentRecord: {
          status: '完成销售',
          customerId: '700520000000000001',
        },
      } as any)
      expect(result).toBeNull()
    })

    it('validateParentImport rejects non-完成销售 status', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerId: '700520000000000001' },
        currentItems: [],
        parentRecord: {
          status: '待审核',
          customerId: '700520000000000001',
        },
      } as any)
      expect(result).toBe('只能选择完成销售的销售订单生成客户对账单')
    })

    it('validateParentImport rejects same-name customers with different ids', () => {
      const result = pi.validateParentImport!({
        currentRecord: {
          customerId: '700520000000000001',
          customerName: '同名客户',
        },
        currentItems: [],
        parentRecord: {
          status: '完成销售',
          customerId: '700520000000000002',
          customerName: '同名客户',
        },
      } as any)
      expect(result).toBe('只能选择同一客户的销售订单生成客户对账单')
    })

    it('validateParentImport rejects mismatched project', () => {
      const result = pi.validateParentImport!({
        currentRecord: {
          customerId: '700520000000000001',
          projectId: '700520000000000010',
        },
        currentItems: [{ projectId: '700520000000000010' }],
        parentRecord: {
          status: '完成销售',
          customerId: '700520000000000001',
          projectId: '700520000000000011',
        },
      } as any)
      expect(result).toBe('只能选择同一项目的销售订单生成客户对账单')
    })

    it('validateParentImport rejects mismatched settlement company', () => {
      const result = pi.validateParentImport!({
        currentRecord: {
          customerId: '700520000000000001',
          settlementCompanyId: 1,
        },
        currentItems: [],
        parentRecord: {
          status: '完成销售',
          customerId: '700520000000000001',
          settlementCompanyId: 2,
        },
      } as any)
      expect(result).toBe('只能选择同一结算主体的销售订单生成客户对账单')
    })

    it('validateParentImport allows empty current project context', () => {
      const result = pi.validateParentImport!({
        currentRecord: { customerId: '700520000000000001', projectId: '' },
        currentItems: [],
        parentRecord: {
          status: '完成销售',
          customerId: '700520000000000001',
          projectId: '700520000000000010',
        },
      } as any)
      expect(result).toBeNull()
    })

    it('validateParentImport matches the stable project id', () => {
      const result = pi.validateParentImport!({
        currentRecord: {
          customerId: '700520000000000001',
          projectId: '700520000000000010',
          projectName: '项目新名称',
        },
        currentItems: [{ projectId: '700520000000000010' }],
        parentRecord: {
          status: '完成销售',
          customerId: '700520000000000001',
          projectId: '700520000000000010',
          projectName: '项目旧名称',
        },
      } as any)
      expect(result).toBeNull()
    })

    it('transformItems maps items from parent record', () => {
      const items = pi.transformItems!({
        orderNo: 'SO-2024-001',
        customerId: '700520000000000001',
        projectId: '700520000000000002',
        items: [
          {
            id: '700520000000000101',
            materialName: '螺纹钢',
            quantity: 10,
            warehouseId: '700520000000000003',
          },
          { id: 2, materialName: '盘螺', quantity: 5 },
        ],
      } as any)
      expect(items).toHaveLength(2)
      expect(items[0]).toMatchObject({
        id: 'SO-2024-001-700520000000000101',
        sourceNo: 'SO-2024-001',
        sourceSalesOrderItemId: '700520000000000101',
        customerId: '700520000000000001',
        projectId: '700520000000000002',
        warehouseId: '700520000000000003',
      })
      expect(items[1].sourceNo).toBe('SO-2024-001')
    })

    it('transformItems handles missing orderNo', () => {
      const items = pi.transformItems!({
        items: [{ id: 1, materialName: '螺纹钢' }],
      } as any)
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('sales-order-1')
    })

    it('transformItems uses index when item id is missing', () => {
      const items = pi.transformItems!({
        items: [{ materialName: '螺纹钢' }],
      } as any)
      expect(items[0].id).toBe('sales-order-0')
      expect(items[0].sourceSalesOrderItemId).toBeUndefined()
    })

    it('transformItems handles non-array items', () => {
      const items = pi.transformItems!({} as any)
      expect(items).toEqual([])
    })
  })
})
