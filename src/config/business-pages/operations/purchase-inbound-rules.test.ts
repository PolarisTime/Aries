import { describe, expect, it, vi } from 'vitest'

vi.mock('@/module-system/core/module-option-resolvers', () => ({
  isPurchaseWeighRequiredCategory: vi.fn(
    (category: unknown) => category === '螺纹钢',
  ),
}))

import type { ModuleRecord } from '@/types/module-page'
import {
  buildPurchaseInboundOverview,
  buildPurchaseInboundParentFilters,
  mapPurchaseOrderToInboundDraft,
  transformPurchaseOrderItemsToInboundItems,
} from './purchase-inbound-rules'

function recordWith(overrides: Record<string, unknown>): ModuleRecord {
  return { id: '1932500000000000001', ...overrides }
}

describe('purchase-inbound-rules', () => {
  describe('buildPurchaseInboundOverview', () => {
    it('空行集合返回零值概览', () => {
      const overview = buildPurchaseInboundOverview([])
      expect(overview).toHaveLength(3)
      expect(overview.every((item) => String(item.value).startsWith('0'))).toBe(
        true,
      )
    })
  })

  describe('buildPurchaseInboundParentFilters', () => {
    it('透传供应商与当前记录 ID', () => {
      const filters = buildPurchaseInboundParentFilters({
        supplierId: '1932500000000000002',
        id: '1932500000000000001',
      })
      expect(filters).toEqual({
        supplierId: '1932500000000000002',
        currentRecordId: '1932500000000000001',
      })
    })
  })

  describe('mapPurchaseOrderToInboundDraft', () => {
    it('映射供应商与结算主体，缺省字段回退为空串', () => {
      const draft = mapPurchaseOrderToInboundDraft(
        recordWith({
          orderNo: 'PO-1',
          supplierId: '1932500000000000002',
          supplierCode: 'S001',
          supplierName: '供应商甲',
        }),
      )
      expect(draft).toEqual({
        purchaseOrderNo: 'PO-1',
        supplierId: '1932500000000000002',
        supplierCode: 'S001',
        supplierName: '供应商甲',
        settlementCompanyId: undefined,
        settlementCompanyName: '',
      })
    })
  })

  describe('transformPurchaseOrderItemsToInboundItems', () => {
    it('父单无明细返回空数组', () => {
      expect(transformPurchaseOrderItemsToInboundItems(recordWith({}))).toEqual(
        [],
      )
    })

    it('过磅品类标记为过磅并计算重量金额', () => {
      const items = transformPurchaseOrderItemsToInboundItems(
        recordWith({
          orderNo: 'PO-1',
          items: [
            {
              id: '1932500000000000003',
              category: '螺纹钢',
              quantity: 10,
              pieceWeightTon: 0.5,
              unitPrice: 3000,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({
        sourceNo: 'PO-1',
        sourcePurchaseOrderItemId: '1932500000000000003',
        settlementMode: '过磅',
        quantity: 10,
        weightTon: 5,
        weighWeightTon: undefined,
        weightAdjustmentTon: 0,
        weightAdjustmentAmount: 0,
        amount: 15000,
      })
    })

    it('理算品类标记为理算', () => {
      const items = transformPurchaseOrderItemsToInboundItems(
        recordWith({
          items: [
            {
              id: '1932500000000000003',
              category: '其它',
              quantity: 2,
              pieceWeightTon: 1,
              unitPrice: 100,
            },
          ],
        }),
      )
      expect(items[0].settlementMode).toBe('理算')
    })

    it('剩余数量缺失时回退原始数量', () => {
      const items = transformPurchaseOrderItemsToInboundItems(
        recordWith({
          items: [
            {
              id: '1932500000000000003',
              quantity: 4,
              pieceWeightTon: 0.25,
              unitPrice: 0,
            },
          ],
        }),
      )
      expect(items[0].quantity).toBe(4)
    })

    it('数量字段非法时保持 NaN 透传（与既有行为一致）', () => {
      const items = transformPurchaseOrderItemsToInboundItems(
        recordWith({
          items: [
            {
              id: '1932500000000000003',
              quantity: Number.NaN,
              pieceWeightTon: Number.NaN,
              unitPrice: Number.NaN,
            },
          ],
        }),
      )
      expect(Number.isNaN(items[0].quantity as number)).toBe(true)
      expect(Number.isNaN(items[0].weightTon as number)).toBe(true)
      expect(Number.isNaN(items[0].amount as number)).toBe(true)
    })
  })
})
