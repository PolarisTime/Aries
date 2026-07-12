import { describe, expect, it } from 'vitest'
import { ENTITY_ID_FIELDS } from '@/types/entity-id'
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
            id: '124',
            materialCode: 'M001',
            quantity: 10,
            unitPrice: 100,
            pieceWeightTon: 0.5,
            piecesPerBundle: 2,
            unit: 'kg',
          },
        ],
        attachmentIds: ['125', '126'],
        createdBy: '0',
        updatedBy: '9223372036854775807',
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

    it('should reject numeric and non-decimal entity ids', () => {
      expect(moduleRecordSchema.safeParse({ id: 123 }).success).toBe(false)
      expect(moduleRecordSchema.safeParse({ id: 'record-123' }).success).toBe(
        false,
      )
      expect(
        moduleRecordSchema.safeParse({
          id: '123',
          attachmentIds: ['attachment-1'],
        }).success,
      ).toBe(false)
    })

    it.each([
      '0',
      '1',
      '9223372036854775807',
    ])('should accept canonical audit actor id %s', (auditActorId) => {
      expect(
        moduleRecordSchema.safeParse({
          id: '123',
          createdBy: auditActorId,
          updatedBy: auditActorId,
        }).success,
      ).toBe(true)
    })

    it.each([
      0,
      1,
      -1,
      9_007_199_254_740_992,
      '-1',
      '00',
      '01',
      '+1',
      '1.0',
      ' 1',
      '1 ',
      '9223372036854775808',
      'system',
      '',
    ])('should reject invalid audit actor id %j', (auditActorId) => {
      expect(
        moduleRecordSchema.safeParse({
          id: '123',
          createdBy: auditActorId,
        }).success,
      ).toBe(false)
      expect(
        moduleRecordSchema.safeParse({
          id: '123',
          updatedBy: auditActorId,
        }).success,
      ).toBe(false)
    })

    it('should keep audit actor ids outside the business entity registry', () => {
      expect(ENTITY_ID_FIELDS.has('createdBy')).toBe(false)
      expect(ENTITY_ID_FIELDS.has('updatedBy')).toBe(false)
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

    it('should reject numeric source ids', () => {
      const data = {
        id: '1',
        quantity: 10,
        unitPrice: 100,
        pieceWeightTon: 0.5,
        piecesPerBundle: 2,
        unit: 'kg',
        materialCode: 'M001',
        sourceInboundItemId: 42,
      }
      expect(salesOrderItemSchema.safeParse(data).success).toBe(false)
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
