import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import {
  filterImportableParentRecords,
  hasImportableQuantity,
  resolveSelectedParentRows,
} from './module-parent-selector-utils'

describe('ModuleParentSelectorOverlay importable record filtering', () => {
  it('keeps purchase orders with audited status and positive sales remaining quantity', () => {
    const records = [
      {
        id: 'po-1',
        status: '已审核',
        items: [
          {
            id: 'poi-1',
            quantity: 5,
            remainingQuantity: 5,
            salesRemainingQuantity: 2,
          },
        ],
      },
      {
        id: 'po-2',
        status: '已审核',
        items: [
          {
            id: 'poi-2',
            quantity: 5,
            remainingQuantity: 5,
            salesRemainingQuantity: 0,
          },
        ],
      },
      {
        id: 'po-3',
        status: '草稿',
        items: [
          {
            id: 'poi-3',
            quantity: 5,
            remainingQuantity: 5,
            salesRemainingQuantity: 2,
          },
        ],
      },
    ] as ModuleRecord[]

    expect(
      filterImportableParentRecords('purchase-order', records).map((r) => r.id),
    ).toEqual(['po-1'])
  })

  it('keeps sales orders with audited status and positive remaining quantity', () => {
    const records = [
      {
        id: 'so-1',
        status: '已审核',
        items: [{ id: 'soi-1', quantity: 5, remainingQuantity: 1 }],
      },
      {
        id: 'so-2',
        status: '已审核',
        items: [{ id: 'soi-2', quantity: 5, remainingQuantity: 0 }],
      },
    ] as ModuleRecord[]

    expect(
      filterImportableParentRecords('sales-order', records).map((r) => r.id),
    ).toEqual(['so-1'])
  })

  it('falls back to quantity when remaining quantity is missing', () => {
    expect(
      hasImportableQuantity('sales-order', {
        id: 'so-1',
        items: [{ id: 'soi-1', quantity: 1 }],
      }),
    ).toBe(true)
  })

  it('keeps only audited freight bills', () => {
    const records = [
      { id: 'fb-1', status: '已审核' },
      { id: 'fb-2', status: '未审核' },
      { id: 'fb-3', status: '草稿' },
    ] as ModuleRecord[]

    expect(
      filterImportableParentRecords('freight-bill', records).map((r) => r.id),
    ).toEqual(['fb-1'])
  })

  it('keeps completed sales orders for customer statement candidates', () => {
    const records = [
      { id: 'so-1', status: '完成销售' },
      { id: 'so-2', status: '已审核' },
    ] as ModuleRecord[]

    expect(
      filterImportableParentRecords(
        'sales-order',
        records,
        'customer-statement',
      ).map((r) => r.id),
    ).toEqual(['so-1'])
  })
})

describe('resolveSelectedParentRows', () => {
  it('uses current page records before cached selected records', () => {
    const cached = { id: '1', orderNo: 'old' } as ModuleRecord
    const current = { id: '1', orderNo: 'new' } as ModuleRecord

    expect(
      resolveSelectedParentRows(['1'], { '1': cached }, [current]),
    ).toEqual([current])
  })

  it('keeps cross-page selected records from cache', () => {
    const cached = { id: '2', orderNo: 'cached' } as ModuleRecord

    expect(resolveSelectedParentRows(['2'], { '2': cached }, [])).toEqual([
      cached,
    ])
  })
})
