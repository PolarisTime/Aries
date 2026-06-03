import { describe, expect, it } from 'vitest'
import { resolvePieceWeightLookupSource } from '@/views/modules/components/piece-weight-source'

describe('piece-weight-source', () => {
  describe('resolvePieceWeightLookupSource', () => {
    it('returns salesOrderItemId when sourceSalesOrderItemId exists', () => {
      const item = { id: '1', sourceSalesOrderItemId: 'so-123' }
      const result = resolvePieceWeightLookupSource('purchase-inbound', item)
      expect(result).toEqual({ salesOrderItemId: 'so-123' })
    })

    it('returns salesOrderItemId when sourceSalesOrderItemId is numeric', () => {
      const item = { id: '1', sourceSalesOrderItemId: 456 }
      const result = resolvePieceWeightLookupSource('purchase-inbound', item)
      expect(result).toEqual({ salesOrderItemId: 456 })
    })

    it('skips sourceSalesOrderItemId when it is empty string', () => {
      const item = { id: '1', sourceSalesOrderItemId: '' }
      const result = resolvePieceWeightLookupSource('purchase-inbound', item)
      expect(result).not.toHaveProperty('salesOrderItemId')
    })

    it('skips sourceSalesOrderItemId when it is whitespace', () => {
      const item = { id: '1', sourceSalesOrderItemId: '   ' }
      const result = resolvePieceWeightLookupSource('purchase-inbound', item)
      expect(result).not.toHaveProperty('salesOrderItemId')
    })

    it('skips sourceSalesOrderItemId when it is Infinity', () => {
      const item = { id: '1', sourceSalesOrderItemId: Infinity }
      const result = resolvePieceWeightLookupSource('purchase-inbound', item)
      expect(result).not.toHaveProperty('salesOrderItemId')
    })

    it('skips sourceSalesOrderItemId when it is NaN', () => {
      const item = { id: '1', sourceSalesOrderItemId: NaN }
      const result = resolvePieceWeightLookupSource('purchase-inbound', item)
      expect(result).not.toHaveProperty('salesOrderItemId')
    })

    it('returns inboundItemId for purchase-inbound module', () => {
      const item = { id: 'item-1' }
      const result = resolvePieceWeightLookupSource('purchase-inbound', item)
      expect(result).toEqual({ inboundItemId: 'item-1' })
    })

    it('returns salesOrderItemId for sales-order module', () => {
      const item = { id: 'item-1' }
      const result = resolvePieceWeightLookupSource('sales-order', item)
      expect(result).toEqual({ salesOrderItemId: 'item-1' })
    })

    it('returns purchaseOrderItemId when sourcePurchaseOrderItemId exists', () => {
      const item = { id: '1', sourcePurchaseOrderItemId: 'po-123' }
      const result = resolvePieceWeightLookupSource('other-module', item)
      expect(result).toEqual({ purchaseOrderItemId: 'po-123' })
    })

    it('skips sourcePurchaseOrderItemId when it is empty', () => {
      const item = { id: '1', sourcePurchaseOrderItemId: '' }
      const result = resolvePieceWeightLookupSource('other-module', item)
      // Empty string is skipped, falls back to item.id as purchaseOrderItemId
      expect(result).toEqual({ purchaseOrderItemId: '1' })
    })

    it('returns purchaseOrderItemId as fallback from item.id', () => {
      const item = { id: 'item-fallback' }
      const result = resolvePieceWeightLookupSource('unknown-module', item)
      expect(result).toEqual({ purchaseOrderItemId: 'item-fallback' })
    })

    it('returns empty object when item.id is empty string', () => {
      const item = { id: '' }
      const result = resolvePieceWeightLookupSource('unknown-module', item)
      expect(result).toEqual({})
    })

    it('returns empty object when item.id is undefined', () => {
      const item = {} as any
      const result = resolvePieceWeightLookupSource('unknown-module', item)
      expect(result).toEqual({})
    })

    it('handles numeric item id', () => {
      const item = { id: 123 }
      const result = resolvePieceWeightLookupSource('unknown-module', item)
      expect(result).toEqual({ purchaseOrderItemId: 123 })
    })

    it('handles numeric item id that is Infinity', () => {
      const item = { id: Infinity }
      const result = resolvePieceWeightLookupSource('unknown-module', item)
      expect(result).toEqual({})
    })

    it('prioritizes sourceSalesOrderItemId over sourcePurchaseOrderItemId', () => {
      const item = { id: '1', sourceSalesOrderItemId: 'so-1', sourcePurchaseOrderItemId: 'po-1' }
      const result = resolvePieceWeightLookupSource('other-module', item)
      expect(result).toEqual({ salesOrderItemId: 'so-1' })
    })

    it('prioritizes sourceSalesOrderItemId over module-specific logic', () => {
      const item = { id: '1', sourceSalesOrderItemId: 'so-1' }
      const result = resolvePieceWeightLookupSource('purchase-inbound', item)
      expect(result).toEqual({ salesOrderItemId: 'so-1' })
    })

    it('uses module-specific logic when sourceSalesOrderItemId is not available', () => {
      const item = { id: '1' }
      const result = resolvePieceWeightLookupSource('purchase-inbound', item)
      expect(result).toEqual({ inboundItemId: '1' })
    })

    it('uses sourcePurchaseOrderItemId when module is not purchase-inbound or sales-order', () => {
      const item = { id: '1', sourcePurchaseOrderItemId: 'po-999' }
      const result = resolvePieceWeightLookupSource('freight-bill', item)
      expect(result).toEqual({ purchaseOrderItemId: 'po-999' })
    })
  })
})
