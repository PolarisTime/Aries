import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import {
  filterImportableParentRecords,
  hasImportableQuantity,
  resolveSelectedParentRows,
} from '@/views/modules/components/module-parent-selector-utils'

describe('module-parent-selector-utils', () => {
  describe('hasImportableQuantity', () => {
    it('returns false when no items', () => {
      const record = { id: '1', items: [] }
      expect(hasImportableQuantity('purchase-order', record)).toBe(false)
    })

    it('returns false when items is not an array', () => {
      const record = { id: '1' } as any
      expect(hasImportableQuantity('purchase-order', record)).toBe(false)
    })

    it('returns true when items have positive salesRemainingQuantity for purchase-order', () => {
      const record = {
        id: '1',
        items: [{ id: 'i1', salesRemainingQuantity: 5, remainingQuantity: 10, quantity: 20 }],
      }
      expect(hasImportableQuantity('purchase-order', record)).toBe(true)
    })

    it('returns false when items have zero salesRemainingQuantity for purchase-order', () => {
      const record = {
        id: '1',
        items: [{ id: 'i1', salesRemainingQuantity: 0, remainingQuantity: 10, quantity: 20 }],
      }
      expect(hasImportableQuantity('purchase-order', record)).toBe(false)
    })

    it('falls back to remainingQuantity when salesRemainingQuantity is missing for purchase-order', () => {
      const record = {
        id: '1',
        items: [{ id: 'i1', remainingQuantity: 10, quantity: 20 }],
      }
      expect(hasImportableQuantity('purchase-order', record)).toBe(true)
    })

    it('falls back to quantity when both are missing for purchase-order', () => {
      const record = {
        id: '1',
        items: [{ id: 'i1', quantity: 20 }],
      }
      expect(hasImportableQuantity('purchase-order', record)).toBe(true)
    })

    it('returns false when all fallbacks are zero for purchase-order', () => {
      const record = {
        id: '1',
        items: [{ id: 'i1', quantity: 0 }],
      }
      expect(hasImportableQuantity('purchase-order', record)).toBe(false)
    })

    it('returns true for sales-order with remaining quantity', () => {
      const record = {
        id: '1',
        items: [{ id: 'i1', remainingQuantity: 5 }],
      }
      expect(hasImportableQuantity('sales-order', record)).toBe(true)
    })

    it('returns false for sales-order with zero remaining quantity', () => {
      const record = {
        id: '1',
        items: [{ id: 'i1', remainingQuantity: 0, quantity: 5 }],
      }
      expect(hasImportableQuantity('sales-order', record)).toBe(false)
    })

    it('falls back to quantity for sales-order when remainingQuantity missing', () => {
      const record = {
        id: '1',
        items: [{ id: 'i1', quantity: 5 }],
      }
      expect(hasImportableQuantity('sales-order', record)).toBe(true)
    })

    it('returns true for other module types', () => {
      const record = {
        id: '1',
        items: [{ id: 'i1', quantity: 1 }],
      }
      expect(hasImportableQuantity('other-module', record)).toBe(true)
    })

    it('returns true for other module types even with zero quantity', () => {
      const record = {
        id: '1',
        items: [{ id: 'i1', quantity: 0 }],
      }
      expect(hasImportableQuantity('other-module', record)).toBe(true)
    })
  })

  describe('filterImportableParentRecords', () => {
    it('filters by audited status for purchase-order', () => {
      const records = [
        { id: '1', status: '已审核', items: [{ id: 'i1', quantity: 10 }] },
        { id: '2', status: '草稿', items: [{ id: 'i2', quantity: 10 }] },
        { id: '3', status: '已审核', items: [{ id: 'i3', quantity: 0 }] },
      ]
      const result = filterImportableParentRecords('purchase-order', records)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('filters by audited status for sales-order', () => {
      const records = [
        { id: '1', status: '已审核', items: [{ id: 'i1', remainingQuantity: 5 }] },
        { id: '2', status: '待审核', items: [{ id: 'i2', remainingQuantity: 5 }] },
        { id: '3', status: '已审核', items: [{ id: 'i3', remainingQuantity: 0 }] },
      ]
      const result = filterImportableParentRecords('sales-order', records)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('filters by audited status for freight-bill', () => {
      const records = [
        { id: '1', status: '已审核' },
        { id: '2', status: '未审核' },
        { id: '3', status: '草稿' },
      ]
      const result = filterImportableParentRecords('freight-bill', records)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('returns all for unknown module key', () => {
      const records = [
        { id: '1', status: 'any' },
        { id: '2', status: 'any' },
      ]
      const result = filterImportableParentRecords('unknown', records)
      expect(result).toHaveLength(2)
    })

    it('filters by completed status for customer statement', () => {
      const records = [
        { id: '1', status: '完成销售' },
        { id: '2', status: '已审核' },
        { id: '3', status: '草稿' },
      ]
      const result = filterImportableParentRecords('sales-order', records, 'customer-statement')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('filters by completed status for supplier statement', () => {
      const records = [
        { id: '1', status: '完成采购' },
        { id: '2', status: '已审核' },
        { id: '3', status: '草稿' },
      ]
      const result = filterImportableParentRecords('purchase-inbound', records, 'supplier-statement')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('filters by audited status for freight statement', () => {
      const records = [
        { id: '1', status: '已审核' },
        { id: '2', status: '草稿' },
      ]
      const result = filterImportableParentRecords('freight-bill', records, 'freight-statement')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('handles empty records array', () => {
      const result = filterImportableParentRecords('purchase-order', [])
      expect(result).toHaveLength(0)
    })

    it('handles records with no items for purchase-order', () => {
      const records = [
        { id: '1', status: '已审核' },
      ]
      const result = filterImportableParentRecords('purchase-order', records)
      expect(result).toHaveLength(0)
    })
  })

  describe('resolveSelectedParentRows', () => {
    it('resolves from current records', () => {
      const current = [{ id: '1', name: 'A' }]
      const result = resolveSelectedParentRows(['1'], {}, current)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('falls back to selectedRecordMap', () => {
      const map = { '2': { id: '2', name: 'B' } }
      const result = resolveSelectedParentRows(['2'], map, [])
      expect(result).toHaveLength(1)
    })

    it('skips missing keys', () => {
      const result = resolveSelectedParentRows(['999'], {}, [])
      expect(result).toHaveLength(0)
    })

    it('prefers current records over cached records', () => {
      const cached = { id: '1', name: 'old' } as ModuleRecord
      const current = { id: '1', name: 'new' } as ModuleRecord
      const result = resolveSelectedParentRows(['1'], { '1': cached }, [current])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('new')
    })

    it('handles multiple selected keys', () => {
      const current = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ]
      const result = resolveSelectedParentRows(['1', '2'], {}, current)
      expect(result).toHaveLength(2)
    })

    it('handles mix of current and cached records', () => {
      const cached = { id: '2', name: 'cached' } as ModuleRecord
      const current = [{ id: '1', name: 'current' }] as ModuleRecord[]
      const result = resolveSelectedParentRows(['1', '2'], { '2': cached }, current)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('current')
      expect(result[1].name).toBe('cached')
    })

    it('handles empty selectedRowKeys', () => {
      const result = resolveSelectedParentRows([], {}, [{ id: '1' }])
      expect(result).toHaveLength(0)
    })

    it('handles duplicate keys', () => {
      const current = [{ id: '1', name: 'A' }]
      const result = resolveSelectedParentRows(['1', '1'], {}, current)
      expect(result).toHaveLength(2)
    })

    it('converts non-string keys to string', () => {
      const current = [{ id: '1', name: 'A' }]
      const result = resolveSelectedParentRows([1 as any], {}, current)
      expect(result).toHaveLength(1)
    })
  })
})
