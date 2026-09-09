import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/DocumentReferenceStatusIcons', () => ({
  DocumentReferenceStatusIcons: () => null,
}))

import type { ModuleRecord } from '@/types/module-page'
import {
  buildSalesOrderOverview,
  buildSalesOrderParentFilters,
  hasOverwrittenOriginalWeight,
  mapPurchaseInboundToSalesOrderDraft,
  renderSalesOrderNo,
  renderSalesOrderTotalWeight,
  sumOriginalWeightTon,
  transformPurchaseInboundItemsToSalesOrderItems,
} from './sales-order-rules'

function recordWith(overrides: Record<string, unknown>): ModuleRecord {
  return { id: '1932500000000000001', ...overrides }
}

describe('sales-order-rules', () => {
  describe('buildSalesOrderOverview', () => {
    it('空行集合返回零值概览', () => {
      const overview = buildSalesOrderOverview([])
      expect(overview).toHaveLength(3)
      expect(overview.every((item) => String(item.value).startsWith('0'))).toBe(
        true,
      )
    })
  })

  describe('buildSalesOrderParentFilters', () => {
    it('透传当前销售订单 ID', () => {
      expect(
        buildSalesOrderParentFilters({ id: '1932500000000000001' }),
      ).toEqual({ currentSalesOrderId: '1932500000000000001' })
      expect(buildSalesOrderParentFilters({})).toEqual({
        currentSalesOrderId: undefined,
      })
    })
  })

  describe('hasOverwrittenOriginalWeight / sumOriginalWeightTon', () => {
    it('缺省明细返回 false 与 0', () => {
      expect(hasOverwrittenOriginalWeight(undefined)).toBe(false)
      expect(sumOriginalWeightTon(undefined)).toBe(0)
    })

    it('原始重量缺失或相等时不算被覆盖', () => {
      expect(
        hasOverwrittenOriginalWeight([
          { id: '1932500000000000002', weightTon: 2 },
        ] as never),
      ).toBe(false)
      expect(
        hasOverwrittenOriginalWeight([
          { id: '1932500000000000002', originalWeightTon: 2, weightTon: 2 },
        ] as never),
      ).toBe(false)
    })

    it('原始重量与当前重量不一致时判定覆盖并汇总', () => {
      const items = [
        { id: '1932500000000000002', originalWeightTon: 3, weightTon: 2 },
        { id: '1932500000000000003', originalWeightTon: 1, weightTon: 1 },
      ] as never
      expect(hasOverwrittenOriginalWeight(items)).toBe(true)
      expect(sumOriginalWeightTon(items)).toBe(4)
    })
  })

  describe('renderSalesOrderTotalWeight', () => {
    it('未覆盖时仅返回格式化重量', () => {
      const node = renderSalesOrderTotalWeight(2.5, recordWith({}))
      expect(node).toBe('2.5')
    })

    it('覆盖时返回带警告的 React 元素', () => {
      const node = renderSalesOrderTotalWeight(
        2,
        recordWith({
          items: [
            { id: '1932500000000000002', originalWeightTon: 5, weightTon: 2 },
          ],
        }),
      )
      expect(node).not.toBe('2')
    })

    it('非法数值显示 -', () => {
      expect(renderSalesOrderTotalWeight(Number.NaN, recordWith({}))).toBe('-')
    })
  })

  describe('renderSalesOrderNo', () => {
    it('返回 React 元素并透传单号', () => {
      const node = renderSalesOrderNo(
        'SO-1',
        recordWith({ referencedByFreightBill: true }),
      )
      expect(node).toBeTruthy()
      expect(node).toHaveProperty('props')
    })
  })

  describe('mapPurchaseInboundToSalesOrderDraft', () => {
    it('汇总入库单号并去重拼接', () => {
      const draft = mapPurchaseInboundToSalesOrderDraft(
        recordWith({
          purchaseOrderNo: 'PO-1',
          orderNo: 'PO-1',
          items: [
            { id: '1932500000000000002', inboundNo: ' IN-1 ' },
            { id: '1932500000000000003', inboundNo: 'IN-1' },
            { id: '1932500000000000004', inboundNo: '  ' },
            { id: '1932500000000000005' },
          ],
        }),
      )
      expect(draft.purchaseOrderNo).toBe('PO-1')
      expect(draft.purchaseInboundNo).toBe('IN-1')
    })

    it('无入库单号时为空串，采购单号回退到订单号', () => {
      const draft = mapPurchaseInboundToSalesOrderDraft(
        recordWith({ orderNo: 'PO-2', items: [] }),
      )
      expect(draft.purchaseInboundNo).toBe('')
      expect(draft.purchaseOrderNo).toBe('PO-2')
    })
  })

  describe('transformPurchaseInboundItemsToSalesOrderItems', () => {
    it('父单无明细返回空数组', () => {
      expect(
        transformPurchaseInboundItemsToSalesOrderItems(recordWith({})),
      ).toEqual([])
    })

    it('按剩余量与单件重量推算剩余重量与金额', () => {
      const items = transformPurchaseInboundItemsToSalesOrderItems(
        recordWith({
          items: [
            {
              id: '1932500000000000002',
              sourceInboundItemId: '1932500000000000009',
              quantity: 10,
              weightTon: 5,
              pieceWeightTon: 0.5,
              unitPrice: 3000,
              salesRemainingQuantity: 4,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({
        sourceInboundItemId: '1932500000000000009',
        sourcePurchaseOrderItemId: undefined,
        pieceWeightTon: 0.5,
        remainingQuantity: 4,
        remainingWeightTon: 2,
        remainingAmount: 6000,
        _sourceTotalQuantity: 10,
        _sourceTotalWeightTon: 5,
        _sourcePieceWeightTon: 0.5,
      })
    })

    it('全量剩余时按总重量取整', () => {
      const items = transformPurchaseInboundItemsToSalesOrderItems(
        recordWith({
          items: [
            {
              id: '1932500000000000002',
              quantity: 10,
              weightTon: 5.5,
              pieceWeightTon: 0.55,
              unitPrice: 100,
              salesRemainingQuantity: 10,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({
        remainingQuantity: 10,
        remainingWeightTon: 5.5,
        remainingAmount: 550,
      })
    })

    it('部分剩余按单件重量推算', () => {
      const items = transformPurchaseInboundItemsToSalesOrderItems(
        recordWith({
          items: [
            {
              id: '1932500000000000002',
              quantity: 10,
              weightTon: 5,
              pieceWeightTon: 0.5,
              unitPrice: 100,
              salesRemainingQuantity: 6,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({
        remainingQuantity: 6,
        remainingWeightTon: 3,
        remainingAmount: 300,
      })
    })

    it('数量字段非法时回退 0（NaN 由 cloneLineItems 归一化为 null）', () => {
      const items = transformPurchaseInboundItemsToSalesOrderItems(
        recordWith({
          items: [
            {
              id: '1932500000000000002',
              quantity: Number.NaN,
              salesRemainingQuantity: Number.NaN,
              weightTon: Number.NaN,
              pieceWeightTon: Number.NaN,
              unitPrice: Number.NaN,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({
        remainingQuantity: 0,
        pieceWeightTon: 0,
        remainingWeightTon: 0,
        remainingAmount: 0,
      })
    })
  })
})
