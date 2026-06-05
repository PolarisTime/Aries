import { describe, expect, it } from 'vitest'
import {
  generatePrimaryNo,
  getModuleRecordPrimaryNo,
  parseParentRelationNos,
} from './module-adapter-shared'

describe('parseParentRelationNos', () => {
  it('returns empty array for empty string', () => {
    expect(parseParentRelationNos('')).toEqual([])
  })

  it('splits by comma and space', () => {
    expect(parseParentRelationNos('CG001, CG002')).toEqual(['CG001', 'CG002'])
  })

  it('splits by Chinese comma', () => {
    expect(parseParentRelationNos('CG001，CG002')).toEqual(['CG001', 'CG002'])
  })

  it('splits by whitespace', () => {
    expect(parseParentRelationNos('CG001 CG002')).toEqual(['CG001', 'CG002'])
  })

  it('deduplicates values', () => {
    expect(parseParentRelationNos('CG001, CG001')).toEqual(['CG001'])
  })

  it('filters out empty items', () => {
    expect(parseParentRelationNos('CG001, , CG002')).toEqual(['CG001', 'CG002'])
  })
})

describe('getModuleRecordPrimaryNo', () => {
  it('uses configuredKey when present', () => {
    const record = { orderNo: 'ORD001', id: '123' }
    expect(getModuleRecordPrimaryNo(record, 'orderNo')).toBe('ORD001')
  })

  it('falls back to primaryNoFallbackKeys', () => {
    const record = { orderNo: 'ORD001', id: '123' }
    expect(getModuleRecordPrimaryNo(record)).toBe('ORD001')
  })

  it('falls back to record id', () => {
    const record = { id: '999' }
    expect(getModuleRecordPrimaryNo(record)).toBe('999')
  })

  it('prefers first matching fallback key', () => {
    const record = { inboundNo: 'INB001', outboundNo: 'OUT001', id: '1' }
    expect(getModuleRecordPrimaryNo(record)).toBe('INB001')
  })

  it('falls back to primaryNoFallbackKeys when configuredKey value is falsy', () => {
    const record = { orderNo: 'ORD001', id: '123', customNo: '' }
    expect(getModuleRecordPrimaryNo(record, 'customNo')).toBe('ORD001')
  })

  it('falls back to id when configuredKey value is falsy and no fallback matches', () => {
    const record = { id: '123', customNo: '' }
    expect(getModuleRecordPrimaryNo(record, 'customNo')).toBe('123')
  })
})

describe('generatePrimaryNo', () => {
  it('uses material master prefix', () => {
    expect(generatePrimaryNo('material', '2026', '0001')).toBe('MAT0001')
  })

  it('uses material-categories prefix', () => {
    expect(generatePrimaryNo('material-categories', '2026', '0001')).toBe(
      'MC0001',
    )
  })

  it('uses supplier prefix', () => {
    expect(generatePrimaryNo('supplier', '2026', '0001')).toBe('SUP0001')
  })

  it('uses department date format', () => {
    expect(generatePrimaryNo('department', '2026', '0001')).toBe('2026-0001')
  })

  it('uses purchase-order prefix map', () => {
    expect(generatePrimaryNo('purchase-order', '2026', '000001')).toBe(
      '2026CG000001',
    )
  })

  it('uses sales-order prefix map', () => {
    expect(generatePrimaryNo('sales-order', '2026', '000001')).toBe(
      '2026XS000001',
    )
  })

  it('uses fallback NO prefix for unknown modules', () => {
    expect(generatePrimaryNo('unknown-module', '2026', '000001')).toBe(
      '2026NO000001',
    )
  })

  it('uses custom fullDate when provided', () => {
    expect(generatePrimaryNo('department', '2026', '0001', '2026-01')).toBe(
      '2026-01-0001',
    )
  })

  it('uses customer master prefix', () => {
    expect(generatePrimaryNo('customer', '2026', '0001')).toBe('CUS0001')
  })

  it('uses carrier master prefix', () => {
    expect(generatePrimaryNo('carrier', '2026', '0001')).toBe('CAR0001')
  })

  it('uses warehouse master prefix', () => {
    expect(generatePrimaryNo('warehouse', '2026', '0001')).toBe('WH0001')
  })

  it('uses purchase-inbound prefix', () => {
    expect(generatePrimaryNo('purchase-inbound', '2026', '000001')).toBe(
      '2026RK000001',
    )
  })

  it('uses sales-outbound prefix', () => {
    expect(generatePrimaryNo('sales-outbound', '2026', '000001')).toBe(
      '2026CK000001',
    )
  })

  it('uses freight-bill prefix', () => {
    expect(generatePrimaryNo('freight-bill', '2026', '000001')).toBe(
      '2026W000001',
    )
  })

  it('uses purchase-contract prefix', () => {
    expect(generatePrimaryNo('purchase-contract', '2026', '000001')).toBe(
      '2026CGHT000001',
    )
  })

  it('uses sales-contract prefix', () => {
    expect(generatePrimaryNo('sales-contract', '2026', '000001')).toBe(
      '2026XSHT000001',
    )
  })

  it('uses supplier-statement prefix', () => {
    expect(generatePrimaryNo('supplier-statement', '2026', '000001')).toBe(
      '2026GYDZ000001',
    )
  })

  it('uses customer-statement prefix', () => {
    expect(generatePrimaryNo('customer-statement', '2026', '000001')).toBe(
      '2026KHDZ000001',
    )
  })

  it('uses freight-statement prefix', () => {
    expect(generatePrimaryNo('freight-statement', '2026', '000001')).toBe(
      '2026WDZ000001',
    )
  })

  it('uses receipts prefix', () => {
    expect(generatePrimaryNo('receipts', '2026', '000001')).toBe('2026SK000001')
  })

  it('uses payments prefix', () => {
    expect(generatePrimaryNo('payments', '2026', '000001')).toBe('2026FK000001')
  })

  it('uses ledger-adjustment prefix', () => {
    expect(generatePrimaryNo('ledger-adjustment', '2026', '000001')).toBe(
      '2026LA000001',
    )
  })

  it('uses invoice-receipt prefix', () => {
    expect(generatePrimaryNo('invoice-receipt', '2026', '000001')).toBe(
      '2026SP000001',
    )
  })

  it('uses invoice-issue prefix', () => {
    expect(generatePrimaryNo('invoice-issue', '2026', '000001')).toBe(
      '2026KP000001',
    )
  })
})
