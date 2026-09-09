import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildFreightStatementOverview,
  buildFreightStatementParentFilters,
  mapFreightBillToFreightStatementDraft,
  transformFreightBillItemsToFreightStatementItems,
  validateFreightStatementParentImport,
} from './freight-statement-rules'

const carrierId = '1932500000000000001'
const otherCarrierId = '1932500000000000002'

function recordWith(overrides: Record<string, unknown>): ModuleRecord {
  return { id: carrierId, ...overrides }
}

describe('freight-statement-rules', () => {
  describe('buildFreightStatementOverview', () => {
    it('空行集合返回零值概览', () => {
      const overview = buildFreightStatementOverview([])
      expect(overview).toHaveLength(4)
      expect(overview.map((item) => item.value)).toEqual([
        '0',
        '0.00',
        '0.00',
        '0.00',
      ])
    })
  })

  describe('buildFreightStatementParentFilters', () => {
    it('空值字段输出 undefined', () => {
      const filters = buildFreightStatementParentFilters({})
      expect(filters.carrierId).toBeUndefined()
      expect(filters.currentRecordId).toBeUndefined()
      expect(filters.settlementCompanyId).toBeUndefined()
    })

    it('非法雪花 ID 抛错', () => {
      expect(() =>
        buildFreightStatementParentFilters({ carrierId: 'x' }),
      ).toThrow()
    })
  })

  describe('mapFreightBillToFreightStatementDraft', () => {
    it('映射物流商与账期，付款金额清零', () => {
      const draft = mapFreightBillToFreightStatementDraft(
        recordWith({
          carrierCode: ' C01 ',
          carrierName: '物流商甲',
          settlementCompanyId: '1932500000000000003',
          settlementCompanyName: '主体一',
          billTime: '2026-03-01',
        }),
      )
      expect(draft).toMatchObject({
        carrierCode: 'C01',
        carrierName: '物流商甲',
        settlementCompanyId: '1932500000000000003',
        settlementCompanyName: '主体一',
        startDate: '2026-03-01',
        endDate: '2026-03-01',
        paidAmount: 0,
        status: '草稿',
      })
    })
  })

  describe('validateFreightStatementParentImport', () => {
    const base = { currentItems: [], currentParentNos: [] }

    it('物流商不一致返回错误', () => {
      const error = validateFreightStatementParentImport({
        ...base,
        currentRecord: { carrierId },
        parentRecord: recordWith({ carrierId: otherCarrierId }),
      })
      expect(error).toBe('只能选择同一物流商的物流单生成物流对账单')
    })

    it('当前未选物流商时通过', () => {
      const error = validateFreightStatementParentImport({
        ...base,
        currentRecord: {},
        parentRecord: recordWith({ carrierId: otherCarrierId }),
      })
      expect(error).toBeNull()
    })

    it('结算主体不一致返回错误', () => {
      const error = validateFreightStatementParentImport({
        ...base,
        currentRecord: {
          carrierId,
          settlementCompanyId: '1932500000000000003',
        },
        parentRecord: recordWith({
          carrierId,
          settlementCompanyId: '1932500000000000004',
        }),
      })
      expect(error).toBe('只能选择同一结算主体的物流单生成物流对账单')
    })

    it('结算主体一致时通过', () => {
      const error = validateFreightStatementParentImport({
        ...base,
        currentRecord: {
          carrierId,
          settlementCompanyId: '1932500000000000003',
        },
        parentRecord: recordWith({
          carrierId,
          settlementCompanyId: '1932500000000000003',
        }),
      })
      expect(error).toBeNull()
    })
  })

  describe('transformFreightBillItemsToFreightStatementItems', () => {
    it('父单无明细返回空数组', () => {
      expect(
        transformFreightBillItemsToFreightStatementItems(recordWith({})),
      ).toEqual([])
    })

    it('补全来源字段并继承父单运费', () => {
      const items = transformFreightBillItemsToFreightStatementItems(
        recordWith({
          billNo: ' FB-1 ',
          customerId: '1932500000000000005',
          projectId: '1932500000000000006',
          billTime: '2026-04-01',
          totalFreight: 800,
          items: [{ id: '1932500000000000007', weightTon: 2 }],
        }),
      )
      expect(items[0]).toMatchObject({
        id: 'FB-1-1932500000000000007',
        sourceNo: 'FB-1',
        sourceFreightBillId: carrierId,
        sourceFreightBillItemId: '1932500000000000007',
        customerId: '1932500000000000005',
        projectId: '1932500000000000006',
        _parentBillTime: '2026-04-01',
        _parentTotalFreight: 800,
      })
    })

    it('无单号回退 freight-bill 前缀，缺失运费回退 0', () => {
      const items = transformFreightBillItemsToFreightStatementItems(
        recordWith({
          items: [{ id: '1932500000000000007' }],
        }),
      )
      expect(items[0].id).toBe('freight-bill-1932500000000000007')
      expect(items[0]._parentTotalFreight).toBe(0)
    })
  })
})
