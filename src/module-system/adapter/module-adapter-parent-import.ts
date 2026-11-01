import {
  DEFAULT_QUANTITY_UNIT,
  hasMaterialSelection,
} from '@/module-system/editor/module-editor-shared'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import type {
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asString, isBlankValue } from '@/utils/type-narrowing'

const SOURCE_PARENT_ITEM_ID_FIELDS = [
  'sourceFreightBillItemId',
  'sourceInboundItemId',
  'sourcePurchaseOrderItemId',
  'sourceSalesOrderItemId',
] as const

export function resolveParentImportDefinition(
  definition: ModuleParentImportDefinition,
  currentRecord: ModuleRecordInput,
): ModuleParentImportDefinition {
  const resolved = definition.resolveParentSelector?.(currentRecord)
  return resolved ? { ...definition, ...resolved } : definition
}

function getSourceParentItemId(item: ModuleLineItem): string {
  for (const field of SOURCE_PARENT_ITEM_ID_FIELDS) {
    const id = parseOptionalEntityId(item[field], field)
    if (id) {
      return id
    }
  }
  return ''
}

/**
 * 该明细行是否来自上游导入（带任一 `source*ItemId`）。
 *
 * <p>导出给编辑器用：导入行的来源、数量上限由上游单据决定，「复制本行」会造出两条
 * 引用同一来源行的副本（各自都 ≤ 上限、合计超量），保存时才被后端按重复来源拒绝。
 * 复用同一份字段清单，避免各处各写一份"哪些字段算导入行"。</p>
 *
 * <p>这里只做「有没有非空值」的宽松判断，不走 {@link getSourceParentItemId} 的实体 ID
 * 校验：它是渲染期谓词（决定按钮是否置灰），遇到脏值应当禁用按钮而不是把编辑器打崩。</p>
 */
export function hasSourceParentItemId(item: ModuleLineItem): boolean {
  return SOURCE_PARENT_ITEM_ID_FIELDS.some((field) => {
    const raw = item[field]
    if (raw === undefined || raw === null) {
      return false
    }
    return String(raw).trim() !== ''
  })
}

function resolvePersistedParentRelationNo(item: ModuleLineItem) {
  const explicitRelationNo = asString(item._parentRelationNo).trim()
  if (explicitRelationNo) {
    return explicitRelationNo
  }
  return asString(item.sourceNo).trim()
}

function resolvePersistedParentRelationId(item: ModuleLineItem) {
  const explicitRelationId = parseOptionalEntityId(
    item._parentRelationId,
    '_parentRelationId',
  )
  return explicitRelationId || ''
}

function toSafeNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const isBlankString = isBlankValue

function isZeroLike(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return true
  }
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue === 0
}

function isEmptyDraftLineItem(item: ModuleLineItem) {
  if (
    resolvePersistedParentRelationId(item) ||
    resolvePersistedParentRelationNo(item) ||
    getSourceParentItemId(item)
  ) {
    return false
  }

  const unit = asString(item.unit).trim()
  const quantityUnit = asString(item.quantityUnit).trim()
  return (
    [
      item.materialCode,
      item.brand,
      item.category,
      item.material,
      item.spec,
      item.length,
      item.batchNo,
      item.warehouseName,
      item.sourceNo,
      item.customerName,
      item.projectName,
      item.materialName,
    ].every(isBlankString) &&
    (!unit || unit === '吨') &&
    (!quantityUnit ||
      (!hasMaterialSelection(item) &&
        quantityUnit === DEFAULT_QUANTITY_UNIT)) &&
    [
      item.quantity,
      item.pieceWeightTon,
      item.piecesPerBundle,
      item.weightTon,
      item.weighWeightTon,
      item.weightAdjustmentTon,
      item.weightAdjustmentAmount,
      item.unitPrice,
      item.amount,
    ].every(isZeroLike)
  )
}

export function buildParentImportState(options: {
  parentImportConfig: ModuleParentImportDefinition
  parentRecord: ModuleRecord
  currentParentNos: string[]
  currentItems: ModuleLineItem[]
  cloneLineItems: (value: unknown) => ModuleLineItem[]
}) {
  const {
    parentImportConfig,
    parentRecord,
    currentParentNos,
    currentItems,
    cloneLineItems,
  } = options

  const parentId = parseEntityId(parentRecord.id, 'parentRecord.id')
  const parentNo = String(
    asString(parentRecord[parentImportConfig.parentDisplayFieldKey]),
  )
  const normalizedCurrentItems = currentItems.filter(
    (item) => !isEmptyDraftLineItem(item),
  )
  const replaceUnlinkedItems =
    parentImportConfig.replaceUnlinkedItemsOnFirstImport === true &&
    currentParentNos.length === 0 &&
    normalizedCurrentItems.every((item) => !getSourceParentItemId(item))
  const effectiveCurrentItems = replaceUnlinkedItems
    ? []
    : normalizedCurrentItems
  const hasPersistedRelationIds = effectiveCurrentItems.some((item) =>
    Boolean(resolvePersistedParentRelationId(item)),
  )
  const currentParentItems = effectiveCurrentItems.filter((item) => {
    const relationId = resolvePersistedParentRelationId(item)
    if (relationId) {
      return relationId === parentId
    }
    return (
      !hasPersistedRelationIds &&
      resolvePersistedParentRelationNo(item) === parentNo
    )
  })
  const hasImportedCurrentParent = hasPersistedRelationIds
    ? currentParentItems.length > 0
    : currentParentNos.includes(parentNo)
  const mergedParentNos = currentParentNos.includes(parentNo)
    ? currentParentNos
    : [...currentParentNos, parentNo]
  const currentParentItemSet = new Set(currentParentItems)
  /*
   * 上限计算用的「已分配」口径（与「替换时保留旧数量」分开算）。
   *
   * <p>服务端 remaining 是否已扣掉本单占用，取决于行是否已落库：</p>
   * <ol>
   *   <li><b>本会话刚导入、尚未保存的行</b>带 `_parentRelationId`（session 标记）：
   *       服务端不知道它们，remaining 未扣减 → 计入就会把上限算成 remaining + 草稿量，
   *       表现为「同一父单导入两次，上限 10 → 20」；</li>
   *   <li><b>已保存行</b>没有该标记（靠 sourceNo 归属父单）：服务端 remaining 已扣掉本单
   *       占用 → 必须加回，否则改单时上限偏小、甚至把已有行判成超量。</li>
   * </ol>
   * <p>其他父单的行照旧累加：它们的占用可能已落库，也可能与本行共用同一来源行。</p>
   */
  const countedAllocationItems = effectiveCurrentItems.filter((item) => {
    if (!currentParentItemSet.has(item)) return true
    return !resolvePersistedParentRelationId(item)
  })
  const mappedValues = parentImportConfig.mapParentToDraft?.(parentRecord) || {}
  const shouldApplyMappedValues =
    !currentParentNos.length ||
    (currentParentNos.length === 1 && hasImportedCurrentParent)

  const sourceItems = parentImportConfig.transformItems
    ? parentImportConfig.transformItems(parentRecord)
    : Array.isArray(parentRecord.items)
      ? cloneLineItems(parentRecord.items)
      : []
  const currentAllocatedQuantityMap = new Map<string, number>()
  const currentAllocatedWeightTonMap = new Map<string, number>()
  const currentAllocatedAmountMap = new Map<string, number>()
  currentParentItems.forEach((item) => {
    const sourceParentItemId = getSourceParentItemId(item)
    if (!sourceParentItemId) {
      return
    }
    currentAllocatedQuantityMap.set(
      sourceParentItemId,
      toSafeNumber(currentAllocatedQuantityMap.get(sourceParentItemId)) +
        toSafeNumber(item.quantity),
    )
    currentAllocatedWeightTonMap.set(
      sourceParentItemId,
      toSafeNumber(currentAllocatedWeightTonMap.get(sourceParentItemId)) +
        toSafeNumber(item.weightTon),
    )
    currentAllocatedAmountMap.set(
      sourceParentItemId,
      toSafeNumber(currentAllocatedAmountMap.get(sourceParentItemId)) +
        toSafeNumber(item.amount),
    )
  })
  /* 上限用的已分配量：只统计「服务端 remaining 已扣减」的行，口径见 countedAllocationItems。 */
  const maxAllocatedQuantityMap = new Map<string, number>()
  const maxAllocatedWeightTonMap = new Map<string, number>()
  const maxAllocatedAmountMap = new Map<string, number>()
  countedAllocationItems.forEach((item) => {
    const sourceParentItemId = getSourceParentItemId(item)
    if (!sourceParentItemId) {
      return
    }
    maxAllocatedQuantityMap.set(
      sourceParentItemId,
      toSafeNumber(maxAllocatedQuantityMap.get(sourceParentItemId)) +
        toSafeNumber(item.quantity),
    )
    maxAllocatedWeightTonMap.set(
      sourceParentItemId,
      toSafeNumber(maxAllocatedWeightTonMap.get(sourceParentItemId)) +
        toSafeNumber(item.weightTon),
    )
    maxAllocatedAmountMap.set(
      sourceParentItemId,
      toSafeNumber(maxAllocatedAmountMap.get(sourceParentItemId)) +
        toSafeNumber(item.amount),
    )
  })
  const importedItems: ModuleLineItem[] = sourceItems.flatMap((item) => {
    const sourceParentItemId = getSourceParentItemId(item)
    const nextItem: ModuleLineItem = {
      ...item,
      _parentRelationId: parentId,
      _parentRelationNo: parentNo,
    }
    if (!sourceParentItemId) {
      return [nextItem]
    }
    const remainingQuantity = toSafeNumber(
      item.remainingQuantity ?? item.quantity,
    )
    const currentAllocatedQuantity = toSafeNumber(
      currentAllocatedQuantityMap.get(sourceParentItemId),
    )
    const nextQuantity =
      currentAllocatedQuantity > 0
        ? currentAllocatedQuantity
        : remainingQuantity
    const explicitMaxImportQuantity = toFiniteNumber(item.maxImportQuantity)
    const maxImportQuantity =
      explicitMaxImportQuantity !== undefined
        ? explicitMaxImportQuantity
        : remainingQuantity +
          toSafeNumber(maxAllocatedQuantityMap.get(sourceParentItemId))
    const remainingWeightTon = toSafeNumber(
      item.remainingWeightTon ?? item._maxImportWeightTon ?? item.weightTon,
    )
    const currentAllocatedWeightTon = toSafeNumber(
      currentAllocatedWeightTonMap.get(sourceParentItemId),
    )
    const nextWeightTon =
      currentAllocatedWeightTon > 0
        ? currentAllocatedWeightTon
        : remainingWeightTon
    const explicitMaxImportWeightTon = toFiniteNumber(
      item.maxImportWeightTon ?? item._maxImportWeightTon,
    )
    const maxImportWeightTon =
      explicitMaxImportWeightTon !== undefined
        ? explicitMaxImportWeightTon
        : remainingWeightTon +
          toSafeNumber(maxAllocatedWeightTonMap.get(sourceParentItemId))
    const remainingAmount = toSafeNumber(
      item.remainingAmount ?? item._maxImportAmount ?? item.amount,
    )
    const currentAllocatedAmount = toSafeNumber(
      currentAllocatedAmountMap.get(sourceParentItemId),
    )
    const nextAmount =
      currentAllocatedAmount > 0 ? currentAllocatedAmount : remainingAmount
    const explicitMaxImportAmount = toFiniteNumber(
      item.maxImportAmount ?? item._maxImportAmount,
    )
    const maxImportAmount =
      explicitMaxImportAmount !== undefined
        ? explicitMaxImportAmount
        : remainingAmount +
          toSafeNumber(maxAllocatedAmountMap.get(sourceParentItemId))

    nextItem.quantity = nextQuantity
    nextItem._maxImportQuantity = maxImportQuantity
    if (remainingWeightTon > 0 || currentAllocatedWeightTon > 0) {
      nextItem.weightTon = nextWeightTon
      nextItem._maxImportWeightTon = maxImportWeightTon
    }
    if (remainingAmount > 0 || currentAllocatedAmount > 0) {
      nextItem.amount = nextAmount
      nextItem._maxImportAmount = maxImportAmount
    }
    return getSourceParentItemId(nextItem) === '' ||
      Number(nextItem.quantity || 0) > 0
      ? [nextItem]
      : []
  })

  return {
    parentId,
    parentNo,
    hasImportedCurrentParent,
    importedItemCount: importedItems.length,
    parentNosText: mergedParentNos.join(', '),
    mappedValues,
    shouldApplyMappedValues,
    nextItems: hasImportedCurrentParent
      ? [
          ...effectiveCurrentItems.filter(
            (item) => !currentParentItemSet.has(item),
          ),
          ...importedItems,
        ]
      : [...effectiveCurrentItems, ...importedItems],
  }
}
