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

function buildModuleLineItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// 前端雪花 ID，与后端 SnowflakeIdGenerator 保持相同 epoch
const SNOWFLAKE_EPOCH = 1704038400000n
const SNOWFLAKE_WORKER_ID = BigInt(Math.floor(Math.random() * 1024))
let snowflakeSequence = 0n
let snowflakeLastTimestamp = -1n

export function generatePlaceholderBatchNo(): string {
  let timestamp = BigInt(Date.now())
  if (timestamp === snowflakeLastTimestamp) {
    snowflakeSequence = (snowflakeSequence + 1n) & 4095n
    if (snowflakeSequence === 0n) {
      while (BigInt(Date.now()) <= timestamp) {
        /* spin */
      }
      timestamp = BigInt(Date.now())
    }
  } else {
    snowflakeSequence = 0n
  }
  snowflakeLastTimestamp = timestamp
  const id =
    ((timestamp - SNOWFLAKE_EPOCH) << 22n) |
    (SNOWFLAKE_WORKER_ID << 12n) |
    snowflakeSequence
  return id.toString(36).toUpperCase()
}

export function buildDefaultEditorLineItem(
  itemId = buildModuleLineItemId(),
  _moduleKey?: string,
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
