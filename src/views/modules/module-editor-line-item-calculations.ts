import { asString } from '@/utils/type-narrowing'
import type { ModuleLineItem } from '@/types/module-page'
import { toRoundedNumber } from './module-editor-shared'

function calculateAveragePieceWeightTon(quantity: unknown, weightTon: unknown) {
  const numericQuantity = Number(quantity || 0)
  const numericWeightTon = Number(weightTon || 0)
  if (
    !Number.isFinite(numericQuantity) ||
    numericQuantity <= 0 ||
    !Number.isFinite(numericWeightTon)
  ) {
    return 0
  }
  return toRoundedNumber(numericWeightTon / numericQuantity + Number.EPSILON, 3)
}

function calculateWeightByPieceWeightTon(
  quantity: unknown,
  pieceWeightTon: unknown,
) {
  return toRoundedNumber(Number(quantity || 0) * Number(pieceWeightTon || 0), 3)
}

function resolveTheoreticalWeightTon(item: ModuleLineItem) {
  const isWeighSettlement = asString(item.settlementMode).trim() === '过磅'
  if (isWeighSettlement) {
    const sourcePieceWeightTon = Number(item._sourcePieceWeightTon)
    if (Number.isFinite(sourcePieceWeightTon) && sourcePieceWeightTon > 0) {
      return calculateWeightByPieceWeightTon(
        item.quantity,
        sourcePieceWeightTon,
      )
    }
    const weightAdjustmentTon = Number(item.weightAdjustmentTon)
    if (
      Number.isFinite(weightAdjustmentTon) &&
      weightAdjustmentTon !== 0 &&
      item.weightTon !== undefined &&
      item.weightTon !== null
    ) {
      return toRoundedNumber(
        Number(item.weightTon || 0) - weightAdjustmentTon,
        3,
      )
    }
  }
  return calculateWeightByPieceWeightTon(item.quantity, item.pieceWeightTon)
}

function resolveSourceInboundResidualWeightTon(
  item: ModuleLineItem,
  defaultWeightTon: number,
) {
  if (!item.sourceInboundItemId && !item.sourcePurchaseOrderItemId) {
    return defaultWeightTon
  }
  const sourceWeighWeightTon = Number(
    item._sourceWeighWeightTon ??
      item._sourceTotalWeightTon ??
      item._maxImportWeightTon,
  )
  const sourceTotalQuantity = Number(item._sourceTotalQuantity)
  const maxImportQuantity = Number(item._maxImportQuantity)
  const quantity = Number(item.quantity || 0)
  if (
    !Number.isFinite(sourceWeighWeightTon) ||
    sourceWeighWeightTon <= 0 ||
    !Number.isFinite(sourceTotalQuantity) ||
    sourceTotalQuantity <= 0 ||
    !Number.isFinite(maxImportQuantity) ||
    maxImportQuantity <= 0 ||
    quantity <= 0 ||
    quantity < maxImportQuantity
  ) {
    return defaultWeightTon
  }
  const sourcePieceWeightTon = Number(
    item._sourcePieceWeightTon || item.pieceWeightTon || 0,
  )
  const allocatedQuantity = Math.max(sourceTotalQuantity - maxImportQuantity, 0)
  const allocatedWeightTon = calculateWeightByPieceWeightTon(
    allocatedQuantity,
    sourcePieceWeightTon,
  )
  return Math.max(
    0,
    toRoundedNumber(sourceWeighWeightTon - allocatedWeightTon, 3),
  )
}

export function recalculateEditorLineItem(
  item: ModuleLineItem,
  changedKey?: string,
) {
  const theoreticalWeightTon = resolveTheoreticalWeightTon(item)
  const isWeighSettlement = asString(item.settlementMode).trim() === '过磅'
  const changedKeyString = String(changedKey || '')
  const changedValue = changedKeyString ? item[changedKeyString] : undefined
  const isChangedValueCleared =
    changedValue === undefined || changedValue === null || changedValue === ''
  const hasWeighWeightTon =
    isWeighSettlement &&
    item.weighWeightTon !== undefined &&
    item.weighWeightTon !== null &&
    item.weighWeightTon !== ''

  if (
    isWeighSettlement &&
    ['weightTon', 'weighWeightTon'].includes(changedKeyString) &&
    isChangedValueCleared
  ) {
    item.weightTon = undefined
    item.weighWeightTon = undefined
    item.pieceWeightTon = 0
    item.amount = 0
    item.weightAdjustmentTon = undefined
    item.weightAdjustmentAmount = undefined
    return item
  }

  if (changedKey === 'settlementMode' && !isWeighSettlement) {
    item.weighWeightTon = undefined
    item.weightTon = theoreticalWeightTon
  }

  if (
    isWeighSettlement &&
    hasWeighWeightTon &&
    ['weighWeightTon', 'quantity', 'settlementMode'].includes(
      String(changedKey),
    )
  ) {
    item.pieceWeightTon = calculateAveragePieceWeightTon(
      item.quantity,
      item.weighWeightTon,
    )
    item.weightTon = calculateWeightByPieceWeightTon(
      item.quantity,
      item.pieceWeightTon,
    )
  } else if (
    changedKey === 'quantity' ||
    changedKey === 'pieceWeightTon' ||
    changedKey === 'settlementMode'
  ) {
    item.weightTon = calculateWeightByPieceWeightTon(
      item.quantity,
      item.pieceWeightTon,
    )
  }

  if (
    !isWeighSettlement &&
    (changedKey === 'quantity' || changedKey === 'pieceWeightTon')
  ) {
    item.weightTon = resolveSourceInboundResidualWeightTon(
      item,
      Number(item.weightTon || 0),
    )
  }

  if (changedKey === 'weightTon' && isWeighSettlement) {
    const hasWeightTon =
      item.weightTon !== undefined &&
      item.weightTon !== null &&
      item.weightTon !== ''
    if (hasWeightTon) {
      item.weightTon = toRoundedNumber(item.weightTon, 3)
      item.weighWeightTon = item.weightTon
      item.pieceWeightTon = calculateAveragePieceWeightTon(
        item.quantity,
        item.weightTon,
      )
    } else {
      item.weighWeightTon = undefined
      item.pieceWeightTon = 0
    }
  }

  if (changedKey === 'amount' && Number(item.weightTon || 0) > 0) {
    item.unitPrice = toRoundedNumber(
      Number(item.amount || 0) / Number(item.weightTon || 0),
      2,
    )
    return item
  }

  if (
    changedKey === 'quantity' ||
    changedKey === 'pieceWeightTon' ||
    changedKey === 'weighWeightTon' ||
    changedKey === 'settlementMode' ||
    changedKey === 'weightTon' ||
    changedKey === 'unitPrice'
  ) {
    item.amount = toRoundedNumber(
      Number(item.weightTon || 0) * Number(item.unitPrice || 0),
      2,
    )
  }

  if (
    changedKey === 'quantity' ||
    changedKey === 'pieceWeightTon' ||
    changedKey === 'weighWeightTon' ||
    changedKey === 'settlementMode' ||
    changedKey === 'weightTon' ||
    changedKey === 'unitPrice'
  ) {
    item.weightAdjustmentTon = toRoundedNumber(
      Number(item.weightTon || 0) - theoreticalWeightTon,
      3,
    )
    item.weightAdjustmentAmount = toRoundedNumber(
      Number(item.weightAdjustmentTon || 0) * Number(item.unitPrice || 0),
      2,
    )
  }

  return item
}
