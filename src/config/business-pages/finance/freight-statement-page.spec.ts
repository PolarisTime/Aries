import { describe, expect, it } from 'vitest'
import { freightStatementPageConfig } from './freight-statement-page'

describe('freightStatementPageConfig', () => {
  const pi = freightStatementPageConfig.parentImport!

  it('has required config fields', () => {
    expect(freightStatementPageConfig.key).toBe('freight-statement')
    expect(freightStatementPageConfig.title).toBeTruthy()
    expect(freightStatementPageConfig.primaryNoKey).toBe('statementNo')
    expect(Array.isArray(freightStatementPageConfig.actions)).toBe(true)
    expect(Array.isArray(freightStatementPageConfig.filters)).toBe(true)
    expect(Array.isArray(freightStatementPageConfig.columns)).toBe(true)
    expect(Array.isArray(freightStatementPageConfig.detailFields)).toBe(true)
    expect(Array.isArray(freightStatementPageConfig.formFields)).toBe(true)
    expect(
      freightStatementPageConfig.columns.map((column) => column.dataIndex),
    ).toContain('carrierCode')
    expect(
      freightStatementPageConfig.detailFields.map((field) => field.key),
    ).toContain('carrierCode')
    expect(freightStatementPageConfig.saveFields?.scalar).toContain(
      'carrierCode',
    )
    expect(freightStatementPageConfig.buildOverview).toBeTypeOf('function')
  })

  it('buildOverview returns results', () => {
    const overview = freightStatementPageConfig.buildOverview([])
    expect(Array.isArray(overview)).toBe(true)
  })

  it('shows the reconciliation columns in business order by default', () => {
    const hiddenColumnKeys = new Set(
      freightStatementPageConfig.defaultHiddenColumnKeys,
    )
    const visibleColumnKeys = freightStatementPageConfig.columns
      .map((column) => column.dataIndex)
      .filter((key) => !hiddenColumnKeys.has(key))

    expect(hiddenColumnKeys).toContain('carrierCode')
    expect(visibleColumnKeys).toEqual([
      'statementNo',
      'carrierName',
      'settlementCompanyName',
      'startDate',
      'endDate',
      'totalWeight',
      'totalFreight',
      'paidAmount',
      'unpaidAmount',
      'status',
      'signStatus',
    ])
  })

  describe('parentImport', () => {
    it('buildParentFilters filters by carrier and status', () => {
      const filters = pi.buildParentFilters!({
        carrierName: ' 承运商A ',
        settlementCompanyId: 9,
      } as any)
      expect(filters).toEqual({
        carrierName: '承运商A',
        settlementCompanyId: 9,
        status: '已审核',
      })
    })

    it('buildParentFilters handles empty carrierName', () => {
      const filters = pi.buildParentFilters!({ carrierName: '' } as any)
      expect(filters).toEqual({
        carrierName: '',
        settlementCompanyId: undefined,
        status: '已审核',
      })
    })

    it('validateBeforeOpen returns null when carrierName is present', () => {
      expect(
        pi.validateBeforeOpen!({ carrierName: '承运商A' } as any),
      ).toBeNull()
    })

    it('validateBeforeOpen returns error when carrierName is empty', () => {
      expect(pi.validateBeforeOpen!({ carrierName: '' } as any)).toBe(
        '请先选择物流商，再选择物流单',
      )
    })

    it('mapParentToDraft maps fields from parent record', () => {
      const draft = pi.mapParentToDraft!({
        carrierName: '承运商A',
        billTime: '2024-01-15',
        settlementCompanyId: 9,
        settlementCompanyName: '主体C',
      } as any)
      expect(draft).toEqual({
        carrierName: '承运商A',
        settlementCompanyId: 9,
        settlementCompanyName: '主体C',
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        paidAmount: 0,
        status: '待审核',
        signStatus: '未签署',
      })
    })

    it('mapParentToDraft handles missing fields', () => {
      const draft = pi.mapParentToDraft!({} as any)
      expect(draft.carrierName).toBe('')
      expect(draft.paidAmount).toBe(0)
    })

    it('validateParentImport passes when status and carrier match', () => {
      const result = pi.validateParentImport!({
        currentRecord: { carrierName: '承运商A' },
        parentRecord: { status: '已审核', carrierName: '承运商A' },
      } as any)
      expect(result).toBeNull()
    })

    it('validateParentImport rejects non-已审核 status', () => {
      const result = pi.validateParentImport!({
        currentRecord: { carrierName: '承运商A' },
        parentRecord: { status: '待审核', carrierName: '承运商A' },
      } as any)
      expect(result).toBe('只能选择已审核的物流单生成物流对账单')
    })

    it('validateParentImport rejects mismatched carrier', () => {
      const result = pi.validateParentImport!({
        currentRecord: { carrierName: '承运商A' },
        parentRecord: { status: '已审核', carrierName: '承运商B' },
      } as any)
      expect(result).toBe('只能选择同一物流商的物流单生成物流对账单')
    })

    it('validateParentImport rejects mismatched settlement company', () => {
      const result = pi.validateParentImport!({
        currentRecord: { carrierName: '承运商A', settlementCompanyId: 1 },
        parentRecord: {
          status: '已审核',
          carrierName: '承运商A',
          settlementCompanyId: 2,
        },
      } as any)
      expect(result).toBe('只能选择同一结算主体的物流单生成物流对账单')
    })

    it('transformItems maps items with freight-specific fields', () => {
      const items = pi.transformItems!({
        billNo: 'FB-2024-001',
        items: [{ id: 1, materialName: '螺纹钢' }],
      } as any)
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('FB-2024-001-1')
      expect(items[0].sourceNo).toBe('FB-2024-001')
      expect(items[0]._parentTotalFreight).toBe(0)
    })

    it('transformItems includes totalFreight from parent', () => {
      const items = pi.transformItems!({
        billNo: 'FB-2024-001',
        totalFreight: 5000,
        items: [{ id: 1 }],
      } as any)
      expect(items[0]._parentTotalFreight).toBe(5000)
    })

    it('transformItems handles missing billNo', () => {
      const items = pi.transformItems!({
        items: [{ id: 1 }],
      } as any)
      expect(items[0].id).toBe('freight-bill-1')
    })

    it('transformItems uses index when item id is missing', () => {
      const items = pi.transformItems!({
        items: [{}],
      } as any)
      expect(items[0].id).toBe('freight-bill-0')
    })

    it('transformItems handles non-array items', () => {
      const items = pi.transformItems!({} as any)
      expect(items).toEqual([])
    })
  })
})
