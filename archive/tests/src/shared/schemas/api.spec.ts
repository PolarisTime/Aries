import { describe, expect, it } from 'vitest'
import {
  businessNoResultSchema,
  documentStatusSchema,
  enabledStatusSchema,
  materialInfoSchema,
  weightPriceSchema,
} from './api'

describe('api schemas', () => {
  describe('businessNoResultSchema', () => {
    it('should validate empty object', () => {
      const result = businessNoResultSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject non-object', () => {
      const result = businessNoResultSchema.safeParse('string')
      expect(result.success).toBe(false)
    })
  })

  describe('materialInfoSchema', () => {
    it('should validate valid material info', () => {
      const data = {
        materialCode: 'M001',
        brand: 'Brand',
        category: 'Category',
        material: 'Material',
        spec: 'Spec',
        length: '100',
        unit: 'kg',
      }
      const result = materialInfoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow all fields optional', () => {
      const result = materialInfoSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject invalid field types', () => {
      const data = { materialCode: 123 }
      const result = materialInfoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('weightPriceSchema', () => {
    it('should validate valid weight/price data', () => {
      const data = {
        quantity: '10',
        quantityUnit: 'kg',
        pieceWeightTon: '0.5',
        piecesPerBundle: '2',
        weightTon: '5',
        unitPrice: '100',
        amount: '500',
      }
      const result = weightPriceSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept numbers', () => {
      const data = {
        quantity: 10,
        pieceWeightTon: 0.5,
      }
      const result = weightPriceSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject invalid types', () => {
      const data = { quantity: true }
      const result = weightPriceSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('documentStatusSchema', () => {
    it('should validate valid status', () => {
      const result = documentStatusSchema.safeParse('草稿')
      expect(result.success).toBe(true)
    })

    it('should validate another status', () => {
      const result = documentStatusSchema.safeParse('已审核')
      expect(result.success).toBe(true)
    })

    it('should reject removed pre outbound status', () => {
      const result = documentStatusSchema.safeParse('预出库')
      expect(result.success).toBe(false)
    })

    it('should reject invalid status', () => {
      const result = documentStatusSchema.safeParse('无效状态')
      expect(result.success).toBe(false)
    })
  })

  describe('enabledStatusSchema', () => {
    it('should validate 正常', () => {
      const result = enabledStatusSchema.safeParse('正常')
      expect(result.success).toBe(true)
    })

    it('should validate 禁用', () => {
      const result = enabledStatusSchema.safeParse('禁用')
      expect(result.success).toBe(true)
    })

    it('should reject other values', () => {
      const result = enabledStatusSchema.safeParse('启用')
      expect(result.success).toBe(false)
    })
  })
})
