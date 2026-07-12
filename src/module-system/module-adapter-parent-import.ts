import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import type {
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { parseParentRelationNos } from './module-adapter-shared'

const SOURCE_PARENT_ITEM_ID_FIELDS = [
  'sourceFreightBillItemId',
  'sourceSalesOutboundItemId',
  'sourceInboundItemId',
  'sourcePurchaseOrderItemId',
  'sourceSalesOrderItemId',
] as const

function getSourceParentItemId(item: ModuleLineItem): string {
  for (const field of SOURCE_PARENT_ITEM_ID_FIELDS) {
    const id = parseOptionalEntityId(item[field], field)
    if (id) {
      return id
    }
  }
  return ''
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

function isBlankString(value: unknown) {
  return asString(value).trim() === ''
}

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
    (!quantityUnit || quantityUnit === '件') &&
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
  const effectiveCurrentItems = currentItems.filter(
    (item) => !isEmptyDraftLineItem(item),
  )
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
        : remainingQuantity + currentAllocatedQuantity
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
        : remainingWeightTon + currentAllocatedWeightTon
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
        : remainingAmount + currentAllocatedAmount

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
            (item) => !currentParentItems.includes(item),
          ),
          ...importedItems,
        ]
      : [...effectiveCurrentItems, ...importedItems],
  }
}

export function buildOccupiedParentMap(
  rows: ModuleRecord[],
  parentFieldKey: string,
  currentEditorRecordId?: string,
) {
  return Object.fromEntries(
    rows.flatMap((record) => {
      if (String(record.id) === String(currentEditorRecordId || '')) return []
      return parseParentRelationNos(record[parentFieldKey]).map(
        (parentNo) => [parentNo, record] as const,
      )
    }),
  )
}
