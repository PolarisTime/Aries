import type { ModuleLineItem, ModuleParentImportDefinition, ModuleRecord } from '@/types/module-page'
import { parseParentRelationNos } from './module-adapter-shared'

function getSourceParentItemId(item: ModuleLineItem) {
  return String(item.sourceInboundItemId || item.sourcePurchaseOrderItemId || item.sourceSalesOrderItemId || '').trim()
}

function toSafeNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function findParentRecordByRelationNo(
  rows: ModuleRecord[],
  parentDisplayFieldKey: string,
  relationNo: string,
) {
  return rows.find((record) => String(record[parentDisplayFieldKey] || '') === relationNo)
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

  const parentNo = String(parentRecord[parentImportConfig.parentDisplayFieldKey] || '')
  const hasImportedCurrentParent = currentParentNos.includes(parentNo)
  const mergedParentNos = hasImportedCurrentParent
    ? currentParentNos
    : [...currentParentNos, parentNo]
  const mappedValues = parentImportConfig.mapParentToDraft?.(parentRecord) || {}
  const shouldApplyMappedValues = !currentParentNos.length || (currentParentNos.length === 1 && hasImportedCurrentParent)

  const sourceItems = parentImportConfig.transformItems
    ? parentImportConfig.transformItems(parentRecord)
    : Array.isArray(parentRecord.items) ? cloneLineItems(parentRecord.items) : []
  const currentParentItems = currentItems.filter((item) => String(item._parentRelationNo || '') === parentNo)
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
      toSafeNumber(currentAllocatedQuantityMap.get(sourceParentItemId)) + toSafeNumber(item.quantity),
    )
    currentAllocatedWeightTonMap.set(
      sourceParentItemId,
      toSafeNumber(currentAllocatedWeightTonMap.get(sourceParentItemId)) + toSafeNumber(item.weightTon),
    )
    currentAllocatedAmountMap.set(
      sourceParentItemId,
      toSafeNumber(currentAllocatedAmountMap.get(sourceParentItemId)) + toSafeNumber(item.amount),
    )
  })
  const importedItems: ModuleLineItem[] = sourceItems
    .map((item): ModuleLineItem => {
      const sourceParentItemId = getSourceParentItemId(item)
      const nextItem: ModuleLineItem = {
        ...item,
        _parentRelationNo: parentNo,
      }
      if (!sourceParentItemId) {
        return nextItem
      }
      const remainingQuantity = toSafeNumber(item.remainingQuantity ?? item.quantity)
      const currentAllocatedQuantity = sourceParentItemId
        ? toSafeNumber(currentAllocatedQuantityMap.get(sourceParentItemId))
        : 0
      const nextQuantity = currentAllocatedQuantity > 0 ? currentAllocatedQuantity : remainingQuantity
      const explicitMaxImportQuantity = toFiniteNumber(item.maxImportQuantity)
      const maxImportQuantity = explicitMaxImportQuantity !== undefined
        ? explicitMaxImportQuantity
        : remainingQuantity + currentAllocatedQuantity
      const remainingWeightTon = toSafeNumber(item.remainingWeightTon ?? item._maxImportWeightTon ?? item.weightTon)
      const currentAllocatedWeightTon = toSafeNumber(currentAllocatedWeightTonMap.get(sourceParentItemId))
      const nextWeightTon = currentAllocatedWeightTon > 0 ? currentAllocatedWeightTon : remainingWeightTon
      const explicitMaxImportWeightTon = toFiniteNumber(item.maxImportWeightTon ?? item._maxImportWeightTon)
      const maxImportWeightTon = explicitMaxImportWeightTon !== undefined
        ? explicitMaxImportWeightTon
        : remainingWeightTon + currentAllocatedWeightTon
      const remainingAmount = toSafeNumber(item.remainingAmount ?? item._maxImportAmount ?? item.amount)
      const currentAllocatedAmount = toSafeNumber(currentAllocatedAmountMap.get(sourceParentItemId))
      const nextAmount = currentAllocatedAmount > 0 ? currentAllocatedAmount : remainingAmount
      const explicitMaxImportAmount = toFiniteNumber(item.maxImportAmount ?? item._maxImportAmount)
      const maxImportAmount = explicitMaxImportAmount !== undefined
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
      return nextItem
    })
    .filter((item) => getSourceParentItemId(item) === '' || Number(item.quantity || 0) > 0)

  return {
    parentNo,
    hasImportedCurrentParent,
    importedItemCount: importedItems.length,
    parentNosText: mergedParentNos.join(', '),
    mappedValues,
    shouldApplyMappedValues,
    nextItems: hasImportedCurrentParent
      ? [
          ...currentItems.filter((item) => String(item._parentRelationNo || '') !== parentNo),
          ...importedItems,
        ]
      : [
          ...currentItems,
          ...importedItems,
        ],
  }
}

export function buildOccupiedParentMap(
  rows: ModuleRecord[],
  parentFieldKey: string,
  currentEditorRecordId?: string,
) {
  return Object.fromEntries(
    rows
      .filter((record) => String(record.id) !== String(currentEditorRecordId || ''))
      .flatMap((record) =>
        parseParentRelationNos(record[parentFieldKey]).map((parentNo) => [parentNo, record] as const),
      ),
  )
}
