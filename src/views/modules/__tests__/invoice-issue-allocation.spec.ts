import { describe, expect, it } from 'vitest'
import { buildInvoiceIssueAllocation } from '../invoice-issue-allocation'

describe('invoice issue allocation', () => {
  it('restores full imported values when target amount is cleared', () => {
    const result = buildInvoiceIssueAllocation([
      {
        id: 'item-1',
        unitPrice: 3200,
        weightTon: 1.2,
        amount: 3840,
        _maxImportWeightTon: 1.5,
        _maxImportAmount: 4800,
      },
      {
        id: 'item-2',
        unitPrice: 3300,
        weightTon: 0.4,
        amount: 1320,
        _maxImportWeightTon: 0.8,
        _maxImportAmount: 2640,
      },
    ], 0)

    expect(result.normalizedTargetAmount).toBe(0)
    expect(result.appliedAmount).toBe(7440)
    expect(result.patches).toEqual([
      { id: 'item-1', quantity: 0, weightTon: 1.5, amount: 4800 },
      { id: 'item-2', quantity: 0, weightTon: 0.8, amount: 2640 },
    ])
  })

  it('uses backend-consistent rounding for partial allocation and snaps target amount', () => {
    const result = buildInvoiceIssueAllocation([
      {
        id: 'item-1',
        unitPrice: 3333.33,
        _maxImportWeightTon: 1,
        _maxImportAmount: 3333.33,
      },
      {
        id: 'item-2',
        unitPrice: 1000,
        _maxImportWeightTon: 1,
        _maxImportAmount: 1000,
      },
    ], 1000.01)

    expect(result.normalizedTargetAmount).toBe(1000)
    expect(result.appliedAmount).toBe(1000)
    expect(result.patches).toEqual([
      { id: 'item-1', quantity: 0, weightTon: 0.3, amount: 1000 },
      { id: 'item-2', quantity: 0, weightTon: 0, amount: 0 },
    ])
  })

  it('keeps quantity consistent when partial allocation must respect whole-piece quantities', () => {
    const result = buildInvoiceIssueAllocation([
      {
        id: 'item-1',
        quantity: 5,
        pieceWeightTon: 0.2,
        unitPrice: 3000,
        _maxImportQuantity: 5,
        _maxImportWeightTon: 1,
        _maxImportAmount: 3000,
      },
      {
        id: 'item-2',
        quantity: 5,
        pieceWeightTon: 0.2,
        unitPrice: 3000,
        _maxImportQuantity: 5,
        _maxImportWeightTon: 1,
        _maxImportAmount: 3000,
      },
    ], 3500)

    expect(result.normalizedTargetAmount).toBe(3000)
    expect(result.appliedAmount).toBe(3000)
    expect(result.patches).toEqual([
      { id: 'item-1', quantity: 5, weightTon: 1, amount: 3000 },
      { id: 'item-2', quantity: 0, weightTon: 0, amount: 0 },
    ])
  })
})
