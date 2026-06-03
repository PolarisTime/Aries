import { describe, expect, it } from 'vitest'
import type { ModuleLineItem } from '@/types/module-page'
import { recalculateEditorLineItem } from './module-editor-line-item-calculations'

function makeItem(overrides: Partial<ModuleLineItem> = {}): ModuleLineItem {
  return {
    id: 'test-1',
    materialCode: '',
    brand: '',
    category: '',
    material: '',
    spec: '',
    length: '',
    unit: '吨',
    batchNo: '',
    quantityUnit: '件',
    pieceWeightTon: 0,
    piecesPerBundle: 0,
    quantity: 0,
    weightTon: 0,
    weighWeightTon: undefined,
    weightAdjustmentTon: 0,
    weightAdjustmentAmount: 0,
    unitPrice: 0,
    amount: 0,
    ...overrides,
  }
}

describe('recalculateEditorLineItem', () => {
  it('clears weigh fields when weighWeightTon is cleared in weigh settlement', () => {
    const item = makeItem({
      settlementMode: '过磅',
      weightTon: undefined,
      weighWeightTon: undefined,
      pieceWeightTon: 0.5,
      amount: 200,
      weightAdjustmentTon: 2,
      weightAdjustmentAmount: 40,
    })
    recalculateEditorLineItem(item, 'weighWeightTon')
    expect(item.weightTon).toBeUndefined()
    expect(item.weighWeightTon).toBeUndefined()
    expect(item.pieceWeightTon).toBe(0)
    expect(item.amount).toBe(0)
    expect(item.weightAdjustmentTon).toBeUndefined()
    expect(item.weightAdjustmentAmount).toBeUndefined()
  })

  it('resets weight when switching from weigh to non-weigh settlement', () => {
    const item = makeItem({
      settlementMode: '过磅',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 10,
      weighWeightTon: 10,
      unitPrice: 100,
    })
    item.settlementMode = '理算'
    recalculateEditorLineItem(item, 'settlementMode')
    expect(item.weightTon).toBe(5)
    expect(item.weighWeightTon).toBe(5)
  })

  it('calculates pieceWeightTon from weighWeightTon in weigh settlement', () => {
    const item = makeItem({
      settlementMode: '过磅',
      quantity: 10,
      weighWeightTon: 50,
      unitPrice: 10,
    })
    recalculateEditorLineItem(item, 'weighWeightTon')
    expect(item.pieceWeightTon).toBe(5)
    expect(item.weightTon).toBe(50)
  })

  it('calculates weightTon from pieceWeightTon when quantity changes', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0.5,
      unitPrice: 100,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.weightTon).toBe(5)
  })

  it('calculates weightTon from pieceWeightTon when pieceWeightTon changes', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0.5,
      unitPrice: 100,
    })
    recalculateEditorLineItem(item, 'pieceWeightTon')
    expect(item.weightTon).toBe(5)
  })

  it('calculates unitPrice from amount and weightTon when amount changes', () => {
    const item = makeItem({
      weightTon: 10,
      amount: 500,
      unitPrice: 0,
    })
    recalculateEditorLineItem(item, 'amount')
    expect(item.unitPrice).toBe(50)
  })

  it('does not calculate unitPrice when weightTon is 0', () => {
    const item = makeItem({
      weightTon: 0,
      amount: 500,
      unitPrice: 0,
    })
    recalculateEditorLineItem(item, 'amount')
    expect(item.unitPrice).toBe(0)
  })

  it('calculates amount when quantity changes', () => {
    const item = makeItem({
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 5,
      unitPrice: 100,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.amount).toBe(500)
  })

  it('calculates amount when unitPrice changes', () => {
    const item = makeItem({
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 5,
      unitPrice: 200,
    })
    recalculateEditorLineItem(item, 'unitPrice')
    expect(item.amount).toBe(1000)
  })

  it('calculates weight adjustment when unitPrice changes with existing weightTon', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 6,
      unitPrice: 100,
    })
    recalculateEditorLineItem(item, 'unitPrice')
    expect(item.weightAdjustmentTon).toBe(1)
    expect(item.weightAdjustmentAmount).toBe(100)
  })

  it('calculates weight adjustment on unitPrice change in non-weigh settlement', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 6,
      unitPrice: 100,
    })
    recalculateEditorLineItem(item, 'unitPrice')
    expect(item.weightAdjustmentTon).toBeCloseTo(1, 3)
    expect(item.weightAdjustmentAmount).toBe(100)
  })

  it('handles weighSettlement with weightTon change', () => {
    const item = makeItem({
      settlementMode: '过磅',
      quantity: 10,
      weightTon: 50,
      unitPrice: 10,
    })
    recalculateEditorLineItem(item, 'weightTon')
    expect(item.weighWeightTon).toBe(50)
    expect(item.pieceWeightTon).toBe(5)
  })

  it('clears weighWeightTon when weightTon is cleared in weigh settlement', () => {
    const item = makeItem({
      settlementMode: '过磅',
      quantity: 10,
      weightTon: undefined as any,
      unitPrice: 10,
    })
    recalculateEditorLineItem(item, 'weightTon')
    expect(item.weighWeightTon).toBeUndefined()
    expect(item.pieceWeightTon).toBe(0)
  })

  it('handles no changedKey gracefully', () => {
    const item = makeItem({
      quantity: 5,
      pieceWeightTon: 0.5,
      weightTon: 2.5,
      unitPrice: 50,
    })
    recalculateEditorLineItem(item, undefined)
    expect(item.amount).toBe(0)
    expect(item.weightAdjustmentTon).toBe(0)
    expect(item.weightAdjustmentAmount).toBe(0)
  })

  it('handles weightTon clear in weigh settlement (changedValue is undefined)', () => {
    const item = makeItem({
      settlementMode: '过磅',
      quantity: 10,
      weightTon: 50,
      weighWeightTon: 50,
      unitPrice: 10,
    })
    recalculateEditorLineItem(item, 'weightTon')
    expect(item.weighWeightTon).toBe(50)
    expect(item.weightTon).toBe(50)
  })

  it('handles resolveSourceInboundResidualWeightTon for sourceInboundItemId', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 5,
      sourceInboundItemId: 'inbound-1',
      _sourceWeighWeightTon: 100,
      _sourceTotalQuantity: 20,
      _maxImportQuantity: 15,
      _sourcePieceWeightTon: 5,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.weightTon).toBeGreaterThan(0)
  })

  it('handles weighSettlement with weightAdjustmentTon', () => {
    const item = makeItem({
      settlementMode: '过磅',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 50,
      weightAdjustmentTon: 10,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.weightTon).toBe(5)
  })

  it('handles weighSettlement with _sourcePieceWeightTon', () => {
    const item = makeItem({
      settlementMode: '过磅',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 50,
      weighWeightTon: 50,
      unitPrice: 10,
      _sourcePieceWeightTon: 5,
    })
    recalculateEditorLineItem(item, 'weighWeightTon')
    expect(item.weightTon).toBe(50)
  })

  it('handles settlementMode change from non-weigh to weigh', () => {
    const item = makeItem({
      settlementMode: '过磅',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 5,
      unitPrice: 100,
    })
    recalculateEditorLineItem(item, 'unitPrice')
    expect(item.weightTon).toBe(5)
    expect(item.amount).toBe(500)
  })

  it('handles sourceInboundItemId residual weight calculation', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 3,
      sourceInboundItemId: 'inbound-1',
      _sourceWeighWeightTon: 100,
      _sourceTotalQuantity: 20,
      _maxImportQuantity: 15,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.weightTon).toBeGreaterThan(0)
  })

  it('handles defaultWeightTon fallback when conditions not met', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 5,
      pieceWeightTon: 0.5,
      weightTon: 2.5,
      sourceInboundItemId: 'inbound-1',
      _sourceWeighWeightTon: 0,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.weightTon).toBe(2.5)
  })

  it('handles sourcePurchaseOrderItemId for residual weight', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 5,
      sourcePurchaseOrderItemId: 'po-item-1',
      _sourceWeighWeightTon: 100,
      _sourceTotalQuantity: 20,
      _maxImportQuantity: 15,
      _sourcePieceWeightTon: 5,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.weightTon).toBeGreaterThan(0)
  })

  it('handles _maxImportWeightTon fallback in residual weight', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 5,
      sourceInboundItemId: 'inbound-1',
      _maxImportWeightTon: 80,
      _sourceTotalQuantity: 20,
      _maxImportQuantity: 15,
      _sourcePieceWeightTon: 5,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.weightTon).toBeGreaterThan(0)
  })

  it('handles _sourceTotalWeightTon fallback in residual weight', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 5,
      sourceInboundItemId: 'inbound-1',
      _sourceTotalWeightTon: 90,
      _sourceTotalQuantity: 20,
      _maxImportQuantity: 15,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.weightTon).toBeGreaterThan(0)
  })

  it('handles remainingAmount in source item', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 5,
      unitPrice: 100,
      sourceInboundItemId: 'inbound-1',
      _sourceWeighWeightTon: 50,
      _sourceTotalQuantity: 20,
      _maxImportQuantity: 10,
      _sourcePieceWeightTon: 2.5,
      remainingAmount: 500,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.weightTon).toBeGreaterThan(0)
  })

  it('handles quantity less than maxImportQuantity in residual weight', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 5,
      pieceWeightTon: 0.5,
      weightTon: 2.5,
      sourceInboundItemId: 'inbound-1',
      _sourceWeighWeightTon: 100,
      _sourceTotalQuantity: 20,
      _maxImportQuantity: 15,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.weightTon).toBe(2.5)
  })

  it('calculates amount from weightTon and unitPrice when weightTon changes in weigh settlement', () => {
    const item = makeItem({
      settlementMode: '过磅',
      quantity: 10,
      weightTon: 50,
      unitPrice: 20,
    })
    recalculateEditorLineItem(item, 'weightTon')
    expect(item.amount).toBe(1000)
  })

  it('handles weigh settlement with quantity change and hasWeighWeightTon', () => {
    const item = makeItem({
      settlementMode: '过磅',
      quantity: 10,
      weighWeightTon: 50,
      pieceWeightTon: 5,
      weightTon: 50,
      unitPrice: 10,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.pieceWeightTon).toBe(5)
    expect(item.weightTon).toBe(50)
  })

  it('handles weigh settlement with settlementMode change and hasWeighWeightTon', () => {
    const item = makeItem({
      settlementMode: '过磅',
      quantity: 10,
      weighWeightTon: 50,
      pieceWeightTon: 5,
      weightTon: 50,
      unitPrice: 10,
    })
    recalculateEditorLineItem(item, 'settlementMode')
    expect(item.pieceWeightTon).toBe(5)
    expect(item.weightTon).toBe(50)
  })

  it('handles non-weigh settlement with quantity change and no source', () => {
    const item = makeItem({
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0.5,
      weightTon: 5,
      unitPrice: 100,
    })
    recalculateEditorLineItem(item, 'quantity')
    expect(item.weightTon).toBe(5)
    expect(item.amount).toBe(500)
  })

  it('handles amount change with zero weightTon', () => {
    const item = makeItem({
      weightTon: 0,
      amount: 500,
      unitPrice: 0,
    })
    recalculateEditorLineItem(item, 'amount')
    expect(item.unitPrice).toBe(0)
  })
})
