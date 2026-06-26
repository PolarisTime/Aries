import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import type { ModuleLineItem } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { toRoundedNumber } from './module-editor-shared'

function calculateWeightByPieceWeightTon(
  quantity: unknown,
  pieceWeightTon: unknown,
) {
  return toRoundedNumber(
    Number(quantity || 0) * Number(pieceWeightTon || 0),
    INTERNAL_WEIGHT_PRECISION,
  )
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
        INTERNAL_WEIGHT_PRECISION,
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
    toRoundedNumber(
      sourceWeighWeightTon - allocatedWeightTon,
      INTERNAL_WEIGHT_PRECISION,
    ),
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
    item.amount = 0
    item.weightAdjustmentTon = undefined
    item.weightAdjustmentAmount = undefined
    return item
  }

  if (changedKey === 'settlementMode' && !isWeighSettlement) {
    item.weightTon = theoreticalWeightTon
    item.weighWeightTon = item.weightTon
  }

  if (
    isWeighSettlement &&
    hasWeighWeightTon &&
    ['weighWeightTon', 'quantity', 'settlementMode'].includes(
      String(changedKey),
    )
  ) {
    item.weightTon = toRoundedNumber(
      item.weighWeightTon,
      INTERNAL_WEIGHT_PRECISION,
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
      item.weightTon = toRoundedNumber(
        item.weightTon,
        INTERNAL_WEIGHT_PRECISION,
      )
      item.weighWeightTon = item.weightTon
    } else {
      item.weighWeightTon = undefined
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
      INTERNAL_WEIGHT_PRECISION,
    )
    item.weightAdjustmentAmount = toRoundedNumber(
      Number(item.weightAdjustmentTon || 0) * Number(item.unitPrice || 0),
      2,
    )
  }

  return item
}
