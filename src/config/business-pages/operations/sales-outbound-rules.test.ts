import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildSalesOutboundOverview,
  buildSalesOutboundParentFilters,
  mapSalesOrderToOutboundDraft,
  transformSalesOrderItemsToOutboundItems,
} from './sales-outbound-rules'

function recordWith(overrides: Record<string, unknown>): ModuleRecord {
  return { id: '1932500000000000001', ...overrides }
}

describe('sales-outbound-rules', () => {
  describe('buildSalesOutboundOverview', () => {
    it('空行集合返回零值概览', () => {
      const overview = buildSalesOutboundOverview([])
      expect(overview).toHaveLength(3)
      expect(overview.every((item) => String(item.value).startsWith('0'))).toBe(
        true,
      )
    })
  })

  describe('buildSalesOutboundParentFilters', () => {
    it('透传当前记录 ID', () => {
      expect(
        buildSalesOutboundParentFilters({ id: '1932500000000000001' }),
      ).toEqual({ currentRecordId: '1932500000000000001' })
    })
  })

  describe('mapSalesOrderToOutboundDraft', () => {
    it('映射客户与项目快照，缺省回退空串', () => {
      const draft = mapSalesOrderToOutboundDraft(
        recordWith({
          customerId: '1932500000000000002',
          customerName: '客户甲',
          projectId: '1932500000000000003',
          projectName: '项目A',
          settlementCompanyId: '1932500000000000004',
          settlementCompanyName: '主体一',
        }),
      )
      expect(draft).toEqual({
        customerId: '1932500000000000002',
        customerName: '客户甲',
        projectId: '1932500000000000003',
        projectName: '项目A',
        settlementCompanyId: '1932500000000000004',
        settlementCompanyName: '主体一',
      })
      expect(mapSalesOrderToOutboundDraft(recordWith({}))).toMatchObject({
        customerName: '',
        projectName: '',
        settlementCompanyName: '',
      })
    })
  })

  describe('transformSalesOrderItemsToOutboundItems', () => {
    it('父单无明细返回空数组', () => {
      expect(transformSalesOrderItemsToOutboundItems(recordWith({}))).toEqual(
        [],
      )
    })

    it('写入来源单号与来源明细 ID', () => {
      const items = transformSalesOrderItemsToOutboundItems(
        recordWith({
          orderNo: ' SO-3 ',
          items: [{ id: '1932500000000000002', weightTon: 1 }],
        }),
      )
      expect(items[0]).toMatchObject({
        sourceNo: ' SO-3 ',
        sourceSalesOrderItemId: '1932500000000000002',
        weightTon: 1,
      })
    })

    it('无单号时来源为空串', () => {
      const items = transformSalesOrderItemsToOutboundItems(
        recordWith({
          items: [{ id: '1932500000000000002' }],
        }),
      )
      expect(items[0].sourceNo).toBe('')
    })

    it('有剩余可出数量时写入 remainingQuantity 并按件重换算重量', () => {
      const items = transformSalesOrderItemsToOutboundItems(
        recordWith({
          orderNo: 'SO-9',
          items: [
            {
              id: '1932500000000000005',
              outboundRemainingQuantity: 4,
              quantity: 10,
              pieceWeightTon: 0.5,
              unitPrice: 100,
              weightTon: 5,
              amount: 500,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({
        sourceSalesOrderItemId: '1932500000000000005',
        remainingQuantity: 4,
        remainingWeightTon: 2,
        remainingAmount: 200,
      })
    })

    it('剩余可出数量为 0 时仍保留明细交由导入逻辑过滤', () => {
      const items = transformSalesOrderItemsToOutboundItems(
        recordWith({
          items: [
            {
              id: '1932500000000000006',
              outboundRemainingQuantity: 0,
              quantity: 3,
              pieceWeightTon: 1,
              unitPrice: 10,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({ remainingQuantity: 0 })
    })

    it('缺少剩余量字段时保持整单快照不追加派生字段', () => {
      const items = transformSalesOrderItemsToOutboundItems(
        recordWith({
          items: [
            {
              id: '1932500000000000007',
              quantity: 8,
              pieceWeightTon: 2,
              weightTon: 16,
              unitPrice: 5,
              amount: 80,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({ weightTon: 16, amount: 80 })
      expect(items[0].remainingQuantity).toBeUndefined()
    })
  })
})
