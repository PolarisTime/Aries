import { describe, expect, it, vi } from 'vitest'

import { logger } from '@/utils/logger'
import { normalizeRecord, normalizeRows } from '../normalizers'

describe('business API normalizers', () => {
  it('normalizes root, line item and nested relation ids', () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    const result = normalizeRecord({
      id: 42,
      customerId: 7,
      traceId: 'trace-1',
      items: [
        {
          id: '101',
          materialId: 8,
          sourcePurchaseOrderItemId: '700520000000000001',
          product: 'A',
        },
      ],
    })

    expect(result).toMatchObject({
      id: '42',
      customerId: '7',
      traceId: 'trace-1',
      items: [
        {
          id: '101',
          materialId: '8',
          sourcePurchaseOrderItemId: '700520000000000001',
          product: 'A',
        },
      ],
    })
  })

  it('keeps an explicit empty items array absent from the normalized model', () => {
    expect(normalizeRecord({ id: '101', items: [] }).items).toBeUndefined()
  })

  it('promotes typed financial allocation sources for detail and editor fields', () => {
    expect(
      normalizeRecord({
        id: '900',
        items: [
          {
            id: '901',
            sourceSupplierStatementId: '700520000000000001',
          },
        ],
      }),
    ).toMatchObject({
      sourceSupplierStatementId: '700520000000000001',
      items: [
        {
          sourceSupplierStatementId: '700520000000000001',
        },
      ],
    })
  })

  it('rejects a missing or non-decimal persisted identity', () => {
    expect(() => normalizeRecord({ name: 'missing' })).toThrow('id')
    expect(() => normalizeRecord({ id: 'record-101' })).toThrow('id')
    expect(() =>
      normalizeRecord({ id: '1', items: [{ lineNo: '10' }] }),
    ).toThrow('items[0].id')
  })

  it('rejects unsafe nested number ids', () => {
    expect(() =>
      normalizeRecord({
        id: '1',
        items: [{ id: '2', warehouseId: Number.MAX_SAFE_INTEGER + 1 }],
      }),
    ).toThrow('items[0].warehouseId')
  })

  it('normalizes arrays and rejects non-record rows', () => {
    expect(
      normalizeRows([
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ]).map((row) => row.id),
    ).toEqual(['1', '2'])
    expect(normalizeRows(null)).toEqual([])
    expect(() => normalizeRows([42, 'string'])).toThrow()
  })
})
