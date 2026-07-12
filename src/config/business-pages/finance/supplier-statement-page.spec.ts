import { describe, expect, it } from 'vitest'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import { supplierStatementPageConfig } from './supplier-statement-page'

describe('supplierStatementPageConfig', () => {
  const pi = supplierStatementPageConfig.parentImport!

  it('has required config fields', () => {
    expect(supplierStatementPageConfig.key).toBe('supplier-statement')
    expect(supplierStatementPageConfig.title).toBeTruthy()
    expect(supplierStatementPageConfig.primaryNoKey).toBeTruthy()
    expect(Array.isArray(supplierStatementPageConfig.actions)).toBe(true)
    expect(Array.isArray(supplierStatementPageConfig.filters)).toBe(true)
    expect(Array.isArray(supplierStatementPageConfig.columns)).toBe(true)
    expect(Array.isArray(supplierStatementPageConfig.detailFields)).toBe(true)
    expect(Array.isArray(supplierStatementPageConfig.formFields)).toBe(true)
    expect(
      supplierStatementPageConfig.columns.map((column) => column.dataIndex),
    ).toContain('supplierCode')
    expect(
      supplierStatementPageConfig.detailFields.map((field) => field.key),
    ).toContain('supplierCode')
    expect(supplierStatementPageConfig.saveFields?.scalar).toContain(
      'supplierCode',
    )
    expect(supplierStatementPageConfig.saveFields?.scalar).toContain(
      'supplierId',
    )
    expect(
      supplierStatementPageConfig.filters.map((filter) => filter.key),
    ).toContain('supplierId')
    expect(
      supplierStatementPageConfig.formFields?.find(
        (field) => field.key === 'supplierId',
      ),
    ).toEqual(expect.objectContaining({ type: 'select', required: true }))
    expect(supplierStatementPageConfig.saveFields?.lineItem).toContain(
      'materialId',
    )
    expect(supplierStatementPageConfig.buildOverview).toBeTypeOf('function')
  })

  it('buildOverview returns results', () => {
    const overview = supplierStatementPageConfig.buildOverview([])
    expect(Array.isArray(overview)).toBe(true)
  })

  it('shows the reconciliation columns in business order by default', () => {
    const hiddenColumnKeys = new Set(
      supplierStatementPageConfig.defaultHiddenColumnKeys,
    )
    const visibleColumnKeys = supplierStatementPageConfig.columns
      .map((column) => column.dataIndex)
      .filter((key) => !hiddenColumnKeys.has(key))

    expect(hiddenColumnKeys).toContain('supplierCode')
    expect(visibleColumnKeys).toEqual([
      'statementNo',
      'supplierName',
      'settlementCompanyName',
      'startDate',
      'endDate',
      'purchaseAmount',
      'paymentAmount',
      'closingAmount',
      'status',
    ])
  })

  describe('parentImport', () => {
    it('buildParentFilters sends stable supplier and current statement ids', () => {
      const filters = pi.buildParentFilters!({
        id: '700520000000000099',
        supplierId: '700520000000000001',
        supplierName: '过期供应商名称',
        settlementCompanyId: '700520000000000007',
      } as any)
      expect(filters).toEqual({
        supplierId: '700520000000000001',
        currentRecordId: '700520000000000099',
        settlementCompanyId: '700520000000000007',
      })
    })

    it('buildParentFilters handles empty identities', () => {
      const filters = pi.buildParentFilters!({ supplierName: '' } as any)
      expect(filters).toEqual({
        supplierId: undefined,
        currentRecordId: undefined,
        settlementCompanyId: undefined,
      })
    })

    it('validateBeforeOpen returns null when supplierId is present', () => {
      expect(
        pi.validateBeforeOpen!({
          supplierId: '700520000000000001',
          supplierName: '供应商A',
        } as any),
      ).toBeNull()
    })

    it('validateBeforeOpen returns error when supplierId is missing', () => {
      expect(
        pi.validateBeforeOpen!({ supplierName: '同名供应商' } as any),
      ).toBe('请先选择供应商，再选择采购入库单')
    })

    it('mapParentToDraft maps fields from parent record', () => {
      const draft = pi.mapParentToDraft!({
        supplierId: '700520000000000001',
        supplierCode: 'SUP-001',
        supplierName: '供应商A',
        inboundDate: '2024-01-15',
        settlementCompanyId: 7,
        settlementCompanyName: '主体A',
      } as any)
      expect(draft).toEqual({
        supplierId: '700520000000000001',
        supplierCode: 'SUP-001',
        supplierName: '供应商A',
        settlementCompanyId: 7,
        settlementCompanyName: '主体A',
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        paymentAmount: 0,
        status: '待确认',
      })
    })

    it('mapParentToDraft handles missing fields', () => {
      const draft = pi.mapParentToDraft!({} as any)
      expect(draft.supplierId).toBeUndefined()
      expect(draft.supplierCode).toBe('')
      expect(draft.supplierName).toBe('')
      expect(draft.startDate).toBe('')
      expect(draft.paymentAmount).toBe(0)
    })

    it('validateParentImport passes for completed inbound from the same supplier', () => {
      const result = pi.validateParentImport!({
        currentRecord: {
          supplierId: '700520000000000001',
          supplierName: '同名供应商',
        },
        parentRecord: {
          status: DOCUMENT_STATUS.INBOUND_COMPLETED,
          supplierId: '700520000000000001',
          supplierName: '同名供应商',
        },
      } as any)
      expect(result).toBeNull()
    })

    it('validateParentImport rejects statuses other than completed inbound', () => {
      const result = pi.validateParentImport!({
        currentRecord: { supplierId: '700520000000000001' },
        parentRecord: {
          status: DOCUMENT_STATUS.PURCHASE_COMPLETED,
          supplierId: '700520000000000001',
        },
      } as any)
      expect(result).toBe('只能选择完成入库的采购入库单生成供应商对账单')
    })

    it('validateParentImport rejects mismatched supplier', () => {
      const result = pi.validateParentImport!({
        currentRecord: {
          supplierId: '700520000000000001',
          supplierName: '同名供应商',
        },
        parentRecord: {
          status: DOCUMENT_STATUS.INBOUND_COMPLETED,
          supplierId: '700520000000000002',
          supplierName: '同名供应商',
        },
      } as any)
      expect(result).toBe('只能选择同一供应商的采购入库单生成供应商对账单')
    })

    it('validateParentImport rejects mismatched settlement company', () => {
      const result = pi.validateParentImport!({
        currentRecord: {
          supplierId: '700520000000000001',
          supplierName: '供应商A',
          settlementCompanyId: 1,
        },
        parentRecord: {
          status: DOCUMENT_STATUS.INBOUND_COMPLETED,
          supplierId: '700520000000000001',
          supplierName: '供应商A',
          settlementCompanyId: 2,
        },
      } as any)
      expect(result).toBe('只能选择同一结算主体的采购入库单生成供应商对账单')
    })

    it('transformItems maps items with source info', () => {
      const items = pi.transformItems!({
        inboundNo: 'PI-2024-001',
        items: [{ id: 1, materialName: '螺纹钢' }],
      } as any)
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('PI-2024-001-1')
      expect(items[0].sourceNo).toBe('PI-2024-001')
      expect(items[0].sourceInboundItemId).toBe(1)
    })

    it('transformItems handles missing inboundNo', () => {
      const items = pi.transformItems!({
        items: [{ id: 1 }],
      } as any)
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('purchase-inbound-1')
    })

    it('transformItems uses index when item id is missing', () => {
      const items = pi.transformItems!({
        items: [{ materialName: '螺纹钢' }],
      } as any)
      expect(items[0].id).toBe('purchase-inbound-0')
      expect(items[0].sourceInboundItemId).toBeUndefined()
    })

    it('transformItems handles non-array items', () => {
      const items = pi.transformItems!({} as any)
      expect(items).toEqual([])
    })
  })
})
