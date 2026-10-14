import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import { getBehaviorValue } from '@/module-system/behavior/module-behavior-registry'
import {
  isPurchaseModule,
  isPurchaseOrder,
  isSalesOutbound,
} from '@/module-system/core/module-category'
import { isPurchaseWeighRequiredCategory } from '@/module-system/core/module-option-resolvers'
import { recalculateEditorLineItem } from '@/module-system/editor/module-editor-line-item-calculations'
import {
  buildDefaultEditorLineItem,
  DEFAULT_QUANTITY_UNIT,
  type EditorItemDragPosition,
  generateBatchNo,
  hasEditorValue,
  hasMaterialSelection,
  inferQuantityUnit,
  toRoundedNumber,
} from '@/module-system/editor/module-editor-shared'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

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

function isDefaultOrZeroNumericValue(value: unknown, defaultValue: unknown) {
  if (isZeroLike(value)) {
    return true
  }
  const numericValue = Number(value)
  const numericDefault = Number(defaultValue)
  return (
    Number.isFinite(numericValue) &&
    Number.isFinite(numericDefault) &&
    numericValue === numericDefault
  )
}

function isPersistedLineItem(item: ModuleLineItem) {
  const rawId = item.id as unknown

  if (typeof rawId === 'number') {
    return Number.isInteger(rawId) && rawId > 0
  }
  const normalizedId = asString(rawId).trim()
  return /^\d+$/.test(normalizedId)
}

function isEmptyDraftLineItem(item: ModuleLineItem, moduleKey: string) {
  const defaultItem = buildDefaultEditorLineItem('', moduleKey)
  const unit = asString(item.unit).trim()
  const quantityUnit = asString(item.quantityUnit).trim()

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
    (!quantityUnit ||
      (!hasMaterialSelection(item) &&
        quantityUnit === defaultItem.quantityUnit)) &&
    isDefaultOrZeroNumericValue(item.quantity, defaultItem.quantity) &&
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
  const nonEmptyItems = items.filter(
    (item) => !isEmptyDraftLineItem(item, moduleKey),
  )
  const strategy = getBehaviorValue(moduleKey, 'lineItemTrimStrategy')
  if (strategy === 'purchaseOrderBlank') {
    return nonEmptyItems
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

  const sourceIndex = items.findIndex((item) => String(item.id) === sourceId)
  const targetIndex = items.findIndex((item) => String(item.id) === targetId)
  if (sourceIndex < 0 || targetIndex < 0) {
    return items
  }

  const nextItems = [...items]
  const [sourceItem] = nextItems.splice(sourceIndex, 1)
  const adjustedTargetIndex =
    sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
  const insertIndex =
    position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1
  nextItems.splice(insertIndex, 0, sourceItem)
  return nextItems
}

/**
 * 按给定 id 顺序重排明细行(整行长按拖动 / Alt+↑↓ 落位后写回行模型)。
 *
 * <p>后端口径是「items 数组顺序即最终顺序, 服务端按 `line_no = 下标 + 1` 重编号」,
 * 因此这里只按 id 重新排列数组, 不改任何行字段, 也不产生新 id —— 服务端按 id 复用实体。</p>
 *
 * <p>顺序未变时**原样返回同一个数组**: 上层的 `setItems` 依赖引用判断是否需要重渲染,
 * 每次拖动都换新引用会让整张表无谓重渲染。传入的 id 里若有当前不存在的(竞态删除),
 * 直接忽略; 数组里没被提到的行按原相对顺序追加在末尾, 不静默丢行。</p>
 */
export function applyEditorLineItemOrder<T extends { id: string }>(
  items: T[],
  orderedIds: string[],
): T[] {
  const byId = new Map(items.map((item) => [String(item.id), item]))
  const nextItems: T[] = []
  for (const id of orderedIds) {
    const item = byId.get(String(id))
    if (item === undefined) continue
    byId.delete(String(id))
    nextItems.push(item)
  }
  for (const item of items) {
    if (byId.has(String(item.id))) nextItems.push(item)
  }
  const unchanged =
    nextItems.length === items.length &&
    nextItems.every((item, index) => item === items[index])
  return unchanged ? items : nextItems
}

export function applyMaterialToEditorLineItem(
  item: ModuleLineItem,
  materialRecord?: ModuleRecord | null,
  moduleKey?: string,
) {
  if (!materialRecord) {
    item.materialId = undefined
    item.materialCode = ''
    item.materialName = ''
    item.brand = ''
    item.category = ''
    item.material = ''
    item.spec = ''
    item.length = ''
    item.unit = '吨'
    item.quantityUnit = DEFAULT_QUANTITY_UNIT
    item.pieceWeightTon = 0
    item.piecesPerBundle = 0
    item.unitPrice = 0
    item.weighWeightTon = undefined
    item.weightAdjustmentTon = 0
    item.weightAdjustmentAmount = 0
    return recalculateEditorLineItem(item, 'quantity')
  }

  item.materialId = materialRecord.id
  item.materialCode = asString(materialRecord.materialCode).trim()
  item.materialName = asString(materialRecord.materialName).trim()
  item.brand = materialRecord.brand || ''
  item.category = materialRecord.category || ''
  item.material = materialRecord.material || ''
  item.spec = materialRecord.spec || ''
  item.length = materialRecord.length || ''
  item.unit = materialRecord.unit || '吨'
  if (!item.batchNo && isPurchaseOrder(moduleKey)) {
    item.batchNo = generateBatchNo()
  }
  item.quantityUnit = inferQuantityUnit(materialRecord)
  item.pieceWeightTon = toRoundedNumber(
    materialRecord.pieceWeightTon || 0,
    INTERNAL_WEIGHT_PRECISION,
  )
  item.piecesPerBundle = toRoundedNumber(materialRecord.piecesPerBundle || 0, 0)
  item.unitPrice = toRoundedNumber(materialRecord.unitPrice || 0, 2)
  item.settlementMode = isPurchaseWeighRequiredCategory(item.category)
    ? '过磅'
    : asString(item.settlementMode)
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
    return INTERNAL_WEIGHT_PRECISION
  }
  if (['unitPrice', 'amount', 'weightAdjustmentAmount'].includes(columnKey)) {
    return 2
  }
  return 0
}

export function getEditorItemMin(columnKey: string, moduleKey?: string) {
  if (['weightAdjustmentTon', 'weightAdjustmentAmount'].includes(columnKey)) {
    return undefined
  }
  if (
    columnKey === 'quantity' &&
    (isPurchaseModule(moduleKey) || isSalesOutbound(moduleKey))
  ) {
    return 1
  }
  if (isNumberEditorColumn(columnKey)) {
    return 0
  }
  return undefined
}
