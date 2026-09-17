import { isPurchaseOrder } from '@/module-system/core/module-category'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export type EditorItemDragPosition = 'before' | 'after'

/** 商品主数据缺失单位时数量单位回落的默认值。 */
export const DEFAULT_QUANTITY_UNIT = '件'

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
  'actualWeightTon',
  'weightAdjustmentTon',
  'weightAdjustmentAmount',
  'amount',
  'deliveredQuantity',
  'returnedQuantity',
  'deliveredNetQuantity',
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

/**
 * 数量单位真源为商品主数据的 `quantityUnit`（数量单位，例：件/支）。
 * 当 quantityUnit 为空/缺失时，回落到商品 `unit`（单位，例：吨）；
 * 仍为空时回落默认「件」。
 */
export function inferQuantityUnit(record?: ModuleRecord | null) {
  const explicitUnit = asString(record?.quantityUnit).trim()
  if (explicitUnit) {
    return explicitUnit
  }

  const sourceUnit = asString(record?.unit).trim()
  if (sourceUnit) {
    return sourceUnit
  }

  return DEFAULT_QUANTITY_UNIT
}

/** 判断行是否已选中商品：数量单位是否来自商品据此判定，而不是字符串等于「件」。 */
export function hasMaterialSelection(record?: ModuleLineItem | null) {
  if (!record) {
    return false
  }
  return (
    hasEditorValue(record.materialId) ||
    hasEditorValue(record.materialCode) ||
    hasEditorValue(record.material)
  )
}

function buildModuleLineItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// 采购订单批号由前端生成，与后端 SnowflakeIdGenerator 保持相同 epoch
const SNOWFLAKE_EPOCH = 1704038400000n
const SNOWFLAKE_WORKER_ID = BigInt(Math.floor(Math.random() * 1024))
let snowflakeSequence = 0n
let snowflakeLastTimestamp = -1n

export function generateBatchNo(): string {
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
  moduleKey?: string,
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
    quantityUnit: DEFAULT_QUANTITY_UNIT,
    pieceWeightTon: 0,
    piecesPerBundle: 0,
    quantity: isPurchaseOrder(moduleKey) ? 1 : 0,
    weightTon: 0,
    weightAdjustmentTon: 0,
    weightAdjustmentAmount: 0,
    unitPrice: 0,
    amount: 0,
  }
}
