import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import {
  orderItemColumns,
  batchOrderItemColumns,
  purchaseItemColumns,
  purchaseInboundItemColumns,
  batchSupplierStatementItemColumns,
} from './shared-item-column-base'

describe('shared-item-column-base', () => {
  describe('orderItemColumns', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(orderItemColumns)).toBe(true)
      expect(orderItemColumns.length).toBeGreaterThan(0)
    })

    it('each column has title and dataIndex', () => {
      for (const col of orderItemColumns) {
        expect(col.title).toBeDefined()
        expect(col.dataIndex).toBeDefined()
      }
    })

    it('contains materialCode column', () => {
      const col = orderItemColumns.find((c) => c.dataIndex === 'materialCode')
      expect(col).toBeDefined()
    })

    it('contains quantity column', () => {
      const col = orderItemColumns.find((c) => c.dataIndex === 'quantity')
      expect(col).toBeDefined()
      expect(col!.required).toBe(true)
    })

    it('contains weightTon column', () => {
      const col = orderItemColumns.find((c) => c.dataIndex === 'weightTon')
      expect(col).toBeDefined()
    })

    it('contains amount column', () => {
      const col = orderItemColumns.find((c) => c.dataIndex === 'amount')
      expect(col).toBeDefined()
    })
  })

  describe('batchOrderItemColumns', () => {
    it('includes batchNo column', () => {
      const col = batchOrderItemColumns.find((c) => c.dataIndex === 'batchNo')
      expect(col).toBeDefined()
    })

    it('has more columns than orderItemColumns', () => {
      expect(batchOrderItemColumns.length).toBeGreaterThan(orderItemColumns.length)
    })
  })

  describe('purchaseItemColumns', () => {
    it('includes warehouseName column', () => {
      const col = purchaseItemColumns.find((c) => c.dataIndex === 'warehouseName')
      expect(col).toBeDefined()
      expect(col!.required).toBe(true)
    })

    it('includes batchNo column', () => {
      const col = purchaseItemColumns.find((c) => c.dataIndex === 'batchNo')
      expect(col).toBeDefined()
    })
  })

  describe('purchaseInboundItemColumns', () => {
    it('includes settlementMode column', () => {
      const col = purchaseInboundItemColumns.find((c) => c.dataIndex === 'settlementMode')
      expect(col).toBeDefined()
    })

    it('includes weighWeightTon column', () => {
      const col = purchaseInboundItemColumns.find((c) => c.dataIndex === 'weighWeightTon')
      expect(col).toBeDefined()
    })

    it('includes weightAdjustmentTon column', () => {
      const col = purchaseInboundItemColumns.find((c) => c.dataIndex === 'weightAdjustmentTon')
      expect(col).toBeDefined()
    })
  })

  describe('batchSupplierStatementItemColumns', () => {
    it('includes weigh columns', () => {
      const col = batchSupplierStatementItemColumns.find((c) => c.dataIndex === 'weighWeightTon')
      expect(col).toBeDefined()
    })
  })
})
