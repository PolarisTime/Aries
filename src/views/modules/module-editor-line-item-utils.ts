import { isPurchaseWeighRequiredCategory } from '@/constants/module-options'
import type { ModuleLineItem } from '@/types/module-page'
import { getBehaviorValue } from './module-behavior-registry'
import { recalculateEditorLineItem } from './module-editor-line-item-calculations'
import {
  buildDefaultEditorLineItem,
  type EditorItemDragPosition,
  hasEditorValue,
  inferQuantityUnit,
  toRoundedNumber,
} from './module-editor-shared'

function isZeroLike(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return true
  }
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue === 0
}

function isBlankLike(value: unknown) {
  return !hasEditorValue(value)
}

function isPersistedLineItem(item: ModuleLineItem) {
  const rawId = item.id as unknown

  if (typeof rawId === 'number') {
    return Number.isInteger(rawId) && rawId > 0
  }
  const normalizedId = String(rawId || '').trim()
  return /^\d+$/.test(normalizedId)
}

function isEmptyDraftLineItem(item: ModuleLineItem) {
  const defaultItem = buildDefaultEditorLineItem('')
  const unit = String(item.unit ?? '').trim()
  const quantityUnit = String(item.quantityUnit ?? '').trim()

  if (isPersistedLineItem(item)) {
    return false
  }

  return (
    isBlankLike(item.materialCode) &&
    isBlankLike(item.brand) &&
    isBlankLike(item.category) &&
    isBlankLike(item.material) &&
    isBlankLike(item.spec) &&
    isBlankLike(item.length) &&
    isBlankLike(item.batchNo) &&
    isBlankLike(item.sourceNo) &&
    isBlankLike(item.sourceStatementId) &&
    isBlankLike(item.customerName) &&
    isBlankLike(item.projectName) &&
    isBlankLike(item.materialName) &&
    isBlankLike(item.warehouseName) &&
    isBlankLike(item.settlementMode) &&
    (!unit || unit === defaultItem.unit) &&
    (!quantityUnit || quantityUnit === defaultItem.quantityUnit) &&
    isZeroLike(item.quantity) &&
    isZeroLike(item.pieceWeightTon) &&
    isZeroLike(item.piecesPerBundle) &&
    isZeroLike(item.weightTon) &&
    isZeroLike(item.weighWeightTon) &&
    isZeroLike(item.weightAdjustmentTon) &&
    isZeroLike(item.weightAdjustmentAmount) &&
    isZeroLike(item.unitPrice) &&
    isZeroLike(item.amount)
  )
}

export function trimEditorItemsForModule(
  moduleKey: string,
  items: ModuleLineItem[],
) {
  const nonEmptyItems = items.filter((item) => !isEmptyDraftLineItem(item))
  const strategy = getBehaviorValue(moduleKey, 'lineItemTrimStrategy')
  if (strategy === 'purchaseOrderBlank') {
    return nonEmptyItems
  }

  if (strategy === 'positiveWeightOrAmount') {
    return nonEmptyItems.filter(
      (item) => Number(item.weightTon || 0) > 0 || Number(item.amount || 0) > 0,
    )
  }

  return nonEmptyItems
}

export function moveEditorLineItemByDrag(
  items: ModuleLineItem[],
  sourceId: string,
  targetId: string,
  position: EditorItemDragPosition,
) {
  if (!sourceId || sourceId === targetId) {
    return items
  }

  const sourceItem = items.find((item) => String(item.id) === sourceId)
  if (!sourceItem) {
    return items
  }

  const nextItems = items.filter((item) => String(item.id) !== sourceId)
  const targetIndex = nextItems.findIndex(
    (item) => String(item.id) === targetId,
  )
  if (targetIndex < 0) {
    return items
  }

  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
  nextItems.splice(insertIndex, 0, sourceItem)
  return nextItems
}

export function applyMaterialToEditorLineItem(
  item: ModuleLineItem,
  materialRecord?: Record<string, unknown> | null,
) {
  if (!materialRecord) {
    return item
  }

  item.brand = materialRecord.brand || ''
  item.category = materialRecord.category || ''
  item.material = materialRecord.material || ''
  item.spec = materialRecord.spec || ''
  item.length = materialRecord.length || ''
  item.unit = materialRecord.unit || '吨'
  item.batchNo = ''
  item.quantityUnit = inferQuantityUnit(materialRecord)
  item.pieceWeightTon = toRoundedNumber(materialRecord.pieceWeightTon || 0, 3)
  item.piecesPerBundle = toRoundedNumber(materialRecord.piecesPerBundle || 0, 0)
  item.unitPrice = toRoundedNumber(materialRecord.unitPrice || 0, 2)
  item.settlementMode = isPurchaseWeighRequiredCategory(item.category)
    ? '过磅'
    : String(item.settlementMode || '理算')
  item.weighWeightTon = undefined
  item.weightAdjustmentTon = 0
  item.weightAdjustmentAmount = 0
  return recalculateEditorLineItem(item, 'quantity')
}

export function isNumberEditorColumn(columnKey: string) {
  return [
    'pieceWeightTon',
    'piecesPerBundle',
    'quantity',
    'weightTon',
    'weighWeightTon',
    'weightAdjustmentTon',
    'weightAdjustmentAmount',
    'unitPrice',
    'amount',
  ].includes(columnKey)
}

export function getEditorItemPrecision(columnKey: string) {
  if (
    [
      'pieceWeightTon',
      'weightTon',
      'weighWeightTon',
      'weightAdjustmentTon',
    ].includes(columnKey)
  ) {
    return 3
  }
  if (['unitPrice', 'amount', 'weightAdjustmentAmount'].includes(columnKey)) {
    return 2
  }
  return 0
}

export function getEditorItemMin(columnKey: string) {
  if (['weightAdjustmentTon', 'weightAdjustmentAmount'].includes(columnKey)) {
    return undefined
  }
  if (isNumberEditorColumn(columnKey)) {
    return 0
  }
  return undefined
}
