import { describe, expect, it } from 'vitest'
import {
  moduleRecordSchema,
  purchaseInboundItemSchema,
  salesOrderItemSchema,
  salesOutboundItemSchema,
} from './module-record'

describe('module-record schemas', () => {
  describe('moduleRecordSchema', () => {
    it('should validate valid module record', () => {
      const data = {
        id: '123',
        status: '草稿',
        remark: '备注',
        items: [
          {
            id: 'item1',
            materialCode: 'M001',
            quantity: 10,
            unitPrice: 100,
            pieceWeightTon: 0.5,
            piecesPerBundle: 2,
            unit: 'kg',
          },
        ],
        attachmentIds: ['att1', 'att2'],
        createdBy: 'user1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      }
      const result = moduleRecordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow minimal record', () => {
      const data = { id: '123' }
      const result = moduleRecordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require id', () => {
      const data = { status: '草稿' }
      const result = moduleRecordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should allow passthrough fields', () => {
      const data = { id: '123', customField: 'value' }
      const result = moduleRecordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('salesOrderItemSchema', () => {
    it('should validate valid sales order item', () => {
      const data = {
        id: '1',
        quantity: 10,
        unitPrice: 100,
        pieceWeightTon: 0.5,
        piecesPerBundle: 2,
        unit: 'kg',
        materialCode: 'M001',
      }
      const result = salesOrderItemSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow optional source fields', () => {
      const data = {
        id: '1',
        quantity: 10,
        unitPrice: 100,
        pieceWeightTon: 0.5,
        piecesPerBundle: 2,
        unit: 'kg',
        materialCode: 'M001',
        sourceInboundItemId: '700520000000000001',
        sourcePurchaseOrderItemId: '700520000000000002',
      }
      const result = salesOrderItemSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('purchaseInboundItemSchema', () => {
    it('should validate valid purchase inbound item', () => {
      const data = {
        id: '1',
        quantity: 10,
        unitPrice: 100,
        pieceWeightTon: 0.5,
        sourcePurchaseOrderItemId: '700520000000000003',
        settlementMode: 'mode',
        weighWeightTon: 5,
        weightAdjustmentTon: 0.1,
        weightAdjustmentAmount: 10,
      }
      const result = purchaseInboundItemSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('salesOutboundItemSchema', () => {
    it('should validate valid sales outbound item', () => {
      const data = {
        id: '1',
        quantity: 10,
        unitPrice: 100,
        pieceWeightTon: 0.5,
        sourceNo: 'SO001',
        sourceSalesOrderItemId: '700520000000000004',
      }
      const result = salesOutboundItemSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})
