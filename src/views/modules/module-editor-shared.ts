import type { ModuleLineItem } from '@/types/module-page'

export type EditorItemDragPosition = 'before' | 'after'

export const DERIVED_READONLY_ITEM_COLUMN_KEYS = new Set([
  'brand',
  'category',
  'material',
  'spec',
  'length',
  'unit',
  'quantityUnit',
  'pieceWeightTon',
  'piecesPerBundle',
  'weightTon',
  'weightAdjustmentTon',
  'weightAdjustmentAmount',
  'amount',
])

export function hasEditorValue(value: unknown) {
  if (value === undefined || value === null) {
    return false
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return true
}

export function toRoundedNumber(value: unknown, precision: number) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return 0
  }
  return Number(numericValue.toFixed(precision))
}

export function inferQuantityUnit(record?: Record<string, unknown> | null) {
  const explicitUnit = String(record?.quantityUnit || '').trim()
  if (explicitUnit) {
    return explicitUnit
  }

  return '件'
}

export function buildModuleLineItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function buildDefaultEditorLineItem(
  itemId = buildModuleLineItemId(),
): ModuleLineItem {
  return {
    id: itemId,
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
    weightAdjustmentTon: 0,
    weightAdjustmentAmount: 0,
    unitPrice: 0,
    amount: 0,
  }
}
