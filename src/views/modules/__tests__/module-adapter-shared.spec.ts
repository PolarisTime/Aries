import { describe, it, expect } from 'vitest'
import {
  normalizeStringArray,
  parseParentRelationNos,
  getModuleRecordPrimaryNo,
  generatePrimaryNo,
  isTagListColumnKey,
  getTagListValues,
  isFriendlyTagColumnKey,
  getFriendlyTagColor,
} from '../module-adapter-shared'

describe('normalizeStringArray', () => {
  it('returns array unchanged with dedup and trim', () => {
    expect(normalizeStringArray(['a ', 'b', ' a'])).toEqual(['a', 'b'])
  })
  it('filters empty strings', () => {
    expect(normalizeStringArray(['', 'a', '  '])).toEqual(['a'])
  })
  it('returns empty array for non-array input', () => {
    expect(normalizeStringArray('not-array')).toEqual([])
    expect(normalizeStringArray(null)).toEqual([])
    expect(normalizeStringArray(undefined)).toEqual([])
  })
  it('handles numeric values', () => {
    expect(normalizeStringArray([1, 2, 1])).toEqual(['1', '2'])
  })
})

describe('parseParentRelationNos', () => {
  it('splits by comma', () => {
    expect(parseParentRelationNos('A, B, C')).toEqual(['A', 'B', 'C'])
  })
  it('splits by Chinese comma', () => {
    expect(parseParentRelationNos('A，B，C')).toEqual(['A', 'B', 'C'])
  })
  it('deduplicates', () => {
    expect(parseParentRelationNos('A, A, B')).toEqual(['A', 'B'])
  })
  it('handles empty input', () => {
    expect(parseParentRelationNos('')).toEqual([])
    expect(parseParentRelationNos(null)).toEqual([])
  })
})

describe('getModuleRecordPrimaryNo', () => {
  it('uses configured key when present', () => {
    expect(getModuleRecordPrimaryNo({ id: 1, orderNo: 'PO-001' } as any, 'orderNo')).toBe('PO-001')
  })
  it('falls back to first matching key', () => {
    expect(getModuleRecordPrimaryNo({ id: 1, inboundNo: 'INB-001' } as any)).toBe('INB-001')
  })
  it('falls back to id as string', () => {
    expect(getModuleRecordPrimaryNo({ id: 99 } as any)).toBe('99')
  })
  it('prioritizes configured key over fallback', () => {
    expect(getModuleRecordPrimaryNo(
      { id: 1, orderNo: 'PO-001', inboundNo: 'INB-001' } as any, 'inboundNo',
    )).toBe('INB-001')
  })
})

describe('generatePrimaryNo', () => {
  it('generates with correct prefix for known modules', () => {
    expect(generatePrimaryNo('purchase-orders', '2026', '001')).toBe('2026CG001')
    expect(generatePrimaryNo('sales-orders', '2026', '001')).toBe('2026XS001')
    expect(generatePrimaryNo('receipts', '2026', '001')).toBe('2026SK001')
    expect(generatePrimaryNo('payments', '2026', '001')).toBe('2026FK001')
    expect(generatePrimaryNo('supplier-statements', '2026', '001')).toBe('2026GYDZ001')
    expect(generatePrimaryNo('customer-statements', '2026', '001')).toBe('2026KHDZ001')
    expect(generatePrimaryNo('freight-statements', '2026', '001')).toBe('2026WDZ001')
    expect(generatePrimaryNo('freight-bills', '2026', '001')).toBe('2026W001')
    expect(generatePrimaryNo('invoice-receipts', '2026', '001')).toBe('2026SP001')
    expect(generatePrimaryNo('invoice-issues', '2026', '001')).toBe('2026KP001')
  })
  it('uses NO for unknown modules', () => {
    expect(generatePrimaryNo('unknown-module', '2026', '001')).toBe('2026NO001')
  })
})

describe('tag helpers', () => {
  it('isTagListColumnKey recognizes roleNames', () => {
    expect(isTagListColumnKey('roleNames')).toBe(true)
    expect(isTagListColumnKey('other')).toBe(false)
  })
  it('getTagListValues splits comma-separated strings', () => {
    expect(getTagListValues('a, b, c')).toEqual(['a', 'b', 'c'])
  })
  it('getTagListValues handles arrays', () => {
    expect(getTagListValues(['a', 'b'])).toEqual(['a', 'b'])
  })
  it('isFriendlyTagColumnKey for known tag columns', () => {
    expect(isFriendlyTagColumnKey('permissionType')).toBe(true)
    expect(isFriendlyTagColumnKey('roleType')).toBe(true)
    expect(isFriendlyTagColumnKey('dataScope')).toBe(true)
    expect(isFriendlyTagColumnKey('unknown')).toBe(false)
  })
  it('getFriendlyTagColor returns correct colors', () => {
    expect(getFriendlyTagColor('dataScope', '全部数据')).toBe('processing')
    expect(getFriendlyTagColor('dataScope', '本部门')).toBe('success')
    expect(getFriendlyTagColor('dataScope', '本人')).toBe('default')
    expect(getFriendlyTagColor('roleType', '系统角色')).toBe('processing')
    expect(getFriendlyTagColor('roleType', '财务角色')).toBe('warning')
    expect(getFriendlyTagColor('unknown', 'x')).toBe('warning')
  })
})
