import { describe, expect, it } from 'vitest'
import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import {
  applyMaterialToEditorLineItem,
  getEditorItemMin,
  getEditorItemPrecision,
  isNumberEditorColumn,
  moveEditorLineItemByDrag,
  trimEditorItemsForModule,
} from './module-editor-line-item-utils'

describe('isNumberEditorColumn', () => {
  it('returns true for known number columns', () => {
    expect(isNumberEditorColumn('quantity')).toBe(true)
    expect(isNumberEditorColumn('weightTon')).toBe(true)
    expect(isNumberEditorColumn('unitPrice')).toBe(true)
  })

  it('returns false for non-number columns', () => {
    expect(isNumberEditorColumn('materialCode')).toBe(false)
    expect(isNumberEditorColumn('brand')).toBe(false)
  })
})

describe('getEditorItemPrecision', () => {
  it('returns internal precision for weight columns', () => {
    expect(getEditorItemPrecision('weightTon')).toBe(INTERNAL_WEIGHT_PRECISION)
    expect(getEditorItemPrecision('pieceWeightTon')).toBe(
      INTERNAL_WEIGHT_PRECISION,
    )
  })

  it('returns 2 for price/amount columns', () => {
    expect(getEditorItemPrecision('unitPrice')).toBe(2)
    expect(getEditorItemPrecision('amount')).toBe(2)
  })

  it('returns 0 for other columns', () => {
    expect(getEditorItemPrecision('quantity')).toBe(0)
    expect(getEditorItemPrecision('piecesPerBundle')).toBe(0)
  })
})

describe('getEditorItemMin', () => {
  it('returns undefined for weight adjustment columns', () => {
    expect(getEditorItemMin('weightAdjustmentTon')).toBeUndefined()
    expect(getEditorItemMin('weightAdjustmentAmount')).toBeUndefined()
  })

  it('returns 0 for other number columns', () => {
    expect(getEditorItemMin('quantity')).toBe(0)
    expect(getEditorItemMin('unitPrice')).toBe(0)
  })

  it('returns undefined for non-number columns', () => {
    expect(getEditorItemMin('materialCode')).toBeUndefined()
  })
})

describe('moveEditorLineItemByDrag', () => {
  const items = [
    { id: '1', materialCode: 'A' },
    { id: '2', materialCode: 'B' },
    { id: '3', materialCode: 'C' },
  ] as any[]

  it('returns same array when sourceId is empty', () => {
    expect(moveEditorLineItemByDrag(items, '', '2', 'before')).toBe(items)
  })

  it('returns same array when sourceId equals targetId', () => {
    expect(moveEditorLineItemByDrag(items, '1', '1', 'before')).toBe(items)
  })

  it('returns same array when sourceItem not found', () => {
    expect(moveEditorLineItemByDrag(items, '999', '2', 'before')).toBe(items)
  })

  it('returns same array when targetIndex not found', () => {
    expect(moveEditorLineItemByDrag(items, '1', '999', 'before')).toBe(items)
  })

  it('moves item before target', () => {
    const result = moveEditorLineItemByDrag([...items], '3', '1', 'before')
    expect(result.map((i: any) => i.id)).toEqual(['3', '1', '2'])
  })

  it('moves item after target', () => {
    const result = moveEditorLineItemByDrag([...items], '1', '2', 'after')
    expect(result.map((i: any) => i.id)).toEqual(['2', '1', '3'])
  })
})

describe('trimEditorItemsForModule', () => {
  it('returns all non-empty items when no strategy', () => {
    const items = [
      {
        id: 'item-1',
        materialCode: 'A',
        quantity: 5,
        weightTon: 10,
        amount: 100,
      },
      {
        id: 'item-2',
        materialCode: '',
        quantity: 0,
        weightTon: 0,
        amount: 0,
        brand: '',
        category: '',
        material: '',
        spec: '',
        length: '',
        batchNo: '',
        sourceNo: '',
        warehouseName: '',
        customerName: '',
        projectName: '',
        materialName: '',
        unit: '吨',
        quantityUnit: '件',
        pieceWeightTon: 0,
        piecesPerBundle: 0,
        weighWeightTon: 0,
        weightAdjustmentTon: 0,
        weightAdjustmentAmount: 0,
        unitPrice: 0,
        settlementMode: '',
      },
    ] as any[]
    const result = trimEditorItemsForModule('unknown', items)
    expect(result).toHaveLength(1)
  })

  it('applies positiveWeightOrAmount strategy', () => {
    const items = [
      {
        id: '1',
        materialCode: 'A',
        weightTon: 0,
        amount: 0,
        quantity: 5,
        brand: '-',
        category: '-',
        material: '-',
        spec: '-',
        length: '-',
        batchNo: '-',
        sourceNo: '-',
        warehouseName: '-',
        customerName: '-',
        projectName: '-',
        materialName: '-',
        unit: '吨',
        quantityUnit: '件',
        pieceWeightTon: 0,
        piecesPerBundle: 0,
        weighWeightTon: 0,
        weightAdjustmentTon: 0,
        weightAdjustmentAmount: 0,
        unitPrice: 0,
        settlementMode: '',
      },
      {
        id: '2',
        materialCode: 'B',
        weightTon: 5,
        amount: 0,
        quantity: 5,
        brand: '-',
        category: '-',
        material: '-',
        spec: '-',
        length: '-',
        batchNo: '-',
        sourceNo: '-',
        warehouseName: '-',
        customerName: '-',
        projectName: '-',
        materialName: '-',
        unit: '吨',
        quantityUnit: '件',
        pieceWeightTon: 0,
        piecesPerBundle: 0,
        weighWeightTon: 0,
        weightAdjustmentTon: 0,
        weightAdjustmentAmount: 0,
        unitPrice: 0,
        settlementMode: '',
      },
    ] as any[]
    const result = trimEditorItemsForModule('invoice-receipt', items)
    expect(result).toHaveLength(1)
  })

  it('applies purchaseOrderBlank strategy', () => {
    const items = [
      { id: '1', materialCode: 'A', quantity: 5, weightTon: 10, amount: 100 },
      {
        id: 'item-2',
        materialCode: '',
        quantity: 0,
        weightTon: 0,
        amount: 0,
        brand: '',
        category: '',
        material: '',
        spec: '',
        length: '',
        batchNo: '',
        sourceNo: '',
        warehouseName: '',
        customerName: '',
        projectName: '',
        materialName: '',
        sourceStatementId: '',
        unit: '吨',
        quantityUnit: '件',
        pieceWeightTon: 0,
        piecesPerBundle: 0,
        weighWeightTon: 0,
        weightAdjustmentTon: 0,
        weightAdjustmentAmount: 0,
        unitPrice: 0,
        settlementMode: '',
      },
    ] as any[]
    const result = trimEditorItemsForModule('purchase-order', items)
    expect(result).toHaveLength(1)
    expect(result[0].materialCode).toBe('A')
  })

  it('trims empty draft items with blank numeric fields', () => {
    const items = [
      {
        id: 'item-empty',
        materialCode: '',
        brand: '',
        category: '',
        material: '',
        spec: '',
        length: '',
        batchNo: '',
        sourceNo: '',
        sourceStatementId: '',
        warehouseName: '',
        customerName: '',
        projectName: '',
        materialName: '',
        settlementMode: '',
        unit: '',
        quantityUnit: '',
        quantity: '',
        pieceWeightTon: '',
        piecesPerBundle: '',
        weightTon: '',
        weighWeightTon: '',
        weightAdjustmentTon: '',
        weightAdjustmentAmount: '',
        unitPrice: '',
        amount: '',
      },
    ] as any[]

    const result = trimEditorItemsForModule('unknown', items)

    expect(result).toEqual([])
  })

  it('keeps persisted numeric id items even when fields are empty', () => {
    const persistedItem = {
      id: 1,
      materialCode: '',
      quantity: 0,
      weightTon: 0,
      amount: 0,
    } as any

    const result = trimEditorItemsForModule('purchase-order', [persistedItem])

    expect(result).toEqual([persistedItem])
  })

  it('keeps items with positive amount in positiveWeightOrAmount strategy', () => {
    const items = [
      {
        id: '1',
        materialCode: 'A',
        weightTon: 0,
        amount: 100,
        quantity: 5,
        brand: '-',
        category: '-',
        material: '-',
        spec: '-',
        length: '-',
        batchNo: '-',
        sourceNo: '-',
        warehouseName: '-',
        customerName: '-',
        projectName: '-',
        materialName: '-',
        unit: '吨',
        quantityUnit: '件',
        pieceWeightTon: 0,
        piecesPerBundle: 0,
        weighWeightTon: 0,
        weightAdjustmentTon: 0,
        weightAdjustmentAmount: 0,
        unitPrice: 0,
        settlementMode: '',
      },
    ] as any[]
    const result = trimEditorItemsForModule('invoice-receipt', items)
    expect(result).toHaveLength(1)
  })
})

describe('applyMaterialToEditorLineItem', () => {
  it('writes material id, code and snapshots from the selected master record', () => {
    const item = {
      id: '1',
      materialId: '100',
      materialCode: 'OLD',
      quantity: 1,
      pieceWeightTon: 0,
      weightTon: 0,
      unitPrice: 0,
      amount: 0,
    } as any

    const result = applyMaterialToEditorLineItem(item, {
      id: '200',
      materialCode: 'M-200',
      brand: '品牌A',
    })

    expect(result).toMatchObject({
      materialId: '200',
      materialCode: 'M-200',
      brand: '品牌A',
    })
  })

  it('clears material identity and authoritative snapshots together', () => {
    const item = {
      id: '1',
      materialId: '100',
      materialCode: 'OLD',
      brand: '旧品牌',
      category: '旧类别',
      material: '旧材质',
      spec: '旧规格',
      length: '旧长度',
      quantity: 1,
      pieceWeightTon: 1,
      piecesPerBundle: 2,
      weightTon: 1,
      unitPrice: 100,
      amount: 100,
    } as any

    const result = applyMaterialToEditorLineItem(item, null)

    expect(result).toMatchObject({
      materialId: undefined,
      materialCode: '',
      brand: '',
      category: '',
      material: '',
      spec: '',
      length: '',
      pieceWeightTon: 0,
      piecesPerBundle: 0,
      unitPrice: 0,
    })
  })

  it('returns item unchanged when no materialRecord', () => {
    const item = { id: '1', materialCode: 'M001' } as any
    const result = applyMaterialToEditorLineItem(item, null)
    expect(result).toBe(item)
  })

  it('applies material fields to item', () => {
    const item = {
      id: '1',
      materialCode: 'M001',
      batchNo: '',
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0,
      unitPrice: 0,
      weightTon: 0,
      amount: 0,
    } as any
    const material = {
      brand: 'BrandA',
      category: 'CategoryB',
      material: 'Steel',
      spec: '10mm',
      length: '6m',
      unit: '吨',
      pieceWeightTon: 0.5,
      piecesPerBundle: 10,
      unitPrice: 100,
    }
    const result = applyMaterialToEditorLineItem(item, material)
    expect(result.brand).toBe('BrandA')
    expect(result.category).toBe('CategoryB')
    expect(result.material).toBe('Steel')
    expect(result.unit).toBe('吨')
    expect(result.unitPrice).toBe(100)
    expect(result.pieceWeightTon).toBe(0.5)
  })

  it('generates batchNo for purchase-order when missing', () => {
    const item = {
      id: '1',
      materialCode: 'M001',
      batchNo: '',
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0,
      unitPrice: 0,
      weightTon: 0,
      amount: 0,
    } as any
    const material = {
      brand: 'A',
      category: 'B',
      material: 'C',
      spec: 'D',
      length: 'E',
    }
    const result = applyMaterialToEditorLineItem(
      item,
      material,
      'purchase-order',
    )
    expect(result.batchNo).toBeTruthy()
  })

  it('does not overwrite existing batchNo for purchase-order', () => {
    const item = {
      id: '1',
      materialCode: 'M001',
      batchNo: 'EXISTING-BATCH',
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0,
      unitPrice: 0,
      weightTon: 0,
      amount: 0,
    } as any
    const material = {
      brand: 'A',
      category: 'B',
      material: 'C',
      spec: 'D',
      length: 'E',
    }
    const result = applyMaterialToEditorLineItem(
      item,
      material,
      'purchase-order',
    )
    expect(result.batchNo).toBe('EXISTING-BATCH')
  })

  it('does not generate batchNo for non-purchase-order modules', () => {
    const item = {
      id: '1',
      materialCode: 'M001',
      batchNo: '',
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0,
      unitPrice: 0,
      weightTon: 0,
      amount: 0,
    } as any
    const material = {
      brand: 'A',
      category: 'B',
      material: 'C',
      spec: 'D',
      length: 'E',
    }
    const result = applyMaterialToEditorLineItem(item, material, 'sales-order')
    expect(result.batchNo).toBe('')
  })

  it('uses default unit 吨 when material has no unit', () => {
    const item = {
      id: '1',
      materialCode: 'M001',
      batchNo: '',
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0,
      unitPrice: 0,
      weightTon: 0,
      amount: 0,
    } as any
    const material = {
      brand: 'A',
      category: 'B',
      material: 'C',
      spec: 'D',
      length: 'E',
    }
    const result = applyMaterialToEditorLineItem(item, material)
    expect(result.unit).toBe('吨')
  })

  it('uses empty strings and zeroes for missing material fields', () => {
    const item = {
      id: '1',
      quantity: 10,
      pieceWeightTon: 1,
      unitPrice: 2,
      weightTon: 0,
      amount: 0,
    } as any

    const result = applyMaterialToEditorLineItem(item, {})

    expect(result.brand).toBe('')
    expect(result.category).toBe('')
    expect(result.material).toBe('')
    expect(result.spec).toBe('')
    expect(result.length).toBe('')
    expect(result.unit).toBe('吨')
    expect(result.pieceWeightTon).toBe(0)
    expect(result.piecesPerBundle).toBe(0)
    expect(result.unitPrice).toBe(0)
  })

  it('preserves settlementMode for non-weigh-required category', () => {
    const item = {
      id: '1',
      materialCode: 'M001',
      batchNo: '',
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0,
      unitPrice: 0,
      weightTon: 0,
      amount: 0,
    } as any
    const material = {
      brand: 'A',
      category: '普通材料',
      material: 'C',
      spec: 'D',
      length: 'E',
    }
    const result = applyMaterialToEditorLineItem(item, material)
    expect(result.settlementMode).toBe('理算')
  })

  it('sets settlementMode to 过磅 for weigh-required material category', () => {
    const item = {
      id: '1',
      materialCode: 'M001',
      batchNo: '',
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0,
      unitPrice: 0,
      weightTon: 0,
      amount: 0,
    } as any
    const material = {
      brand: 'A',
      category: '盘螺',
      material: 'C',
      spec: 'D',
      length: 'E',
      pieceWeightTon: 0.5,
      unitPrice: 100,
    }

    const result = applyMaterialToEditorLineItem(item, material)

    expect(result.settlementMode).toBe('过磅')
    expect(result.weightAdjustmentTon).toBe(0)
  })

  it('resets weighWeightTon and adjustments when applying material', () => {
    const item = {
      id: '1',
      materialCode: 'M001',
      batchNo: '',
      settlementMode: '理算',
      quantity: 10,
      pieceWeightTon: 0,
      unitPrice: 0,
      weightTon: 0,
      amount: 0,
      weighWeightTon: 50,
      weightAdjustmentTon: 5,
      weightAdjustmentAmount: 100,
    } as any
    const material = {
      brand: 'A',
      category: 'B',
      material: 'C',
      spec: 'D',
      length: 'E',
      pieceWeightTon: 0.5,
      piecesPerBundle: 10,
      unitPrice: 200,
    }
    const result = applyMaterialToEditorLineItem(item, material)
    expect(result.weighWeightTon).toBeUndefined()
    expect(result.weightAdjustmentTon).toBe(0)
    expect(result.weightAdjustmentAmount).toBe(0)
    expect(result.pieceWeightTon).toBe(0.5)
    expect(result.piecesPerBundle).toBe(10)
    expect(result.unitPrice).toBe(200)
  })

  it('keeps high precision piece weight when applying material', () => {
    const item = {
      id: '1',
      quantity: 1,
      pieceWeightTon: 0,
      weightTon: 0,
      unitPrice: 0,
      amount: 0,
    } as any
    const material = {
      brand: 'A',
      category: 'B',
      material: 'C',
      spec: 'D',
      length: 'E',
      pieceWeightTon: 0.005555,
    }

    const result = applyMaterialToEditorLineItem(item, material)

    expect(result.pieceWeightTon).toBe(0.005555)
    expect(result.weightTon).toBe(0.005555)
  })
})
