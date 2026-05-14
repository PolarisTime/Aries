import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export type EditorItemDragPosition = 'before' | 'after'

export const DERIVED_READONLY_ITEM_COLUMN_KEYS = new Set([
  'sourceNo',
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

export function inferQuantityUnit(record?: ModuleRecord | null) {
  const explicitUnit = asString(record?.quantityUnit).trim()
  if (explicitUnit) {
    return explicitUnit
  }

  return '件'
}

export function buildModuleLineItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function generateBatchNo(): string {
  const now = new Date()
  const y = String(now.getFullYear()).slice(2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `B${y}${m}${d}${h}${min}${s}`
}

export function buildDefaultEditorLineItem(
  itemId = buildModuleLineItemId(),
  moduleKey?: string,
): ModuleLineItem {
  const autoBatchNo = moduleKey === 'purchase-order' ? generateBatchNo() : ''
  return {
    id: itemId,
    materialCode: '',
    brand: '',
    category: '',
    material: '',
    spec: '',
    length: '',
    unit: '吨',
    batchNo: autoBatchNo,
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
