import type { ModuleLineItem } from '@/types/module-page'

export interface InvoiceIssueItemPatch {
  id: string
  quantity: number
  weightTon: number
  amount: number
}

export interface InvoiceIssueAllocationResult {
  appliedAmount: number
  normalizedTargetAmount: number
  patches: InvoiceIssueItemPatch[]
}

function toSafeNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function roundNumber(value: unknown, precision: number) {
  return Number(toSafeNumber(value).toFixed(precision))
}

function calculateLineAmount(weightTon: number, unitPrice: number) {
  return roundNumber(weightTon * unitPrice, 2)
}

export function getInvoiceIssueItemMaxWeightTon(item: ModuleLineItem) {
  const explicitMax = item._maxImportWeightTon
  if (explicitMax !== undefined && explicitMax !== null && explicitMax !== '') {
    return roundNumber(explicitMax, 3)
  }
  return roundNumber(item.weightTon, 3)
}

export function getInvoiceIssueItemMaxQuantity(item: ModuleLineItem) {
  const explicitMax = item._maxImportQuantity
  if (explicitMax !== undefined && explicitMax !== null && explicitMax !== '') {
    return Math.max(Math.trunc(toSafeNumber(explicitMax)), 0)
  }
  return Math.max(Math.trunc(toSafeNumber(item.quantity)), 0)
}

export function getInvoiceIssueItemMaxAmount(item: ModuleLineItem) {
  const explicitMax = item._maxImportAmount
  if (explicitMax !== undefined && explicitMax !== null && explicitMax !== '') {
    return roundNumber(explicitMax, 2)
  }
  return calculateLineAmount(getInvoiceIssueItemMaxWeightTon(item), toSafeNumber(item.unitPrice))
}

function buildWeightOnlyPartialAllocation(maxWeightTon: number, unitPrice: number, remainingAmount: number) {
  if (maxWeightTon <= 0 || unitPrice <= 0 || remainingAmount <= 0) {
    return { quantity: 0, amount: 0, weightTon: 0 }
  }

  let weightTon = Math.min(roundNumber(remainingAmount / unitPrice, 3), maxWeightTon)
  let amount = calculateLineAmount(weightTon, unitPrice)

  while (weightTon > 0 && amount > remainingAmount) {
    weightTon = roundNumber(Math.max(weightTon - 0.001, 0), 3)
    amount = calculateLineAmount(weightTon, unitPrice)
  }

  return { quantity: 0, amount, weightTon }
}

function buildQuantityBasedPartialAllocation(
  maxQuantity: number,
  maxWeightTon: number,
  pieceWeightTon: number,
  unitPrice: number,
  remainingAmount: number,
) {
  if (maxQuantity <= 0 || maxWeightTon <= 0 || pieceWeightTon <= 0 || unitPrice <= 0 || remainingAmount <= 0) {
    return { quantity: 0, amount: 0, weightTon: 0 }
  }

  const maxQuantityByWeight = Math.min(maxQuantity, Math.floor(maxWeightTon / pieceWeightTon))
  let quantity = Math.min(
    maxQuantityByWeight,
    Math.floor(remainingAmount / calculateLineAmount(pieceWeightTon, unitPrice)),
  )

  while (quantity > 0) {
    const weightTon = roundNumber(quantity * pieceWeightTon, 3)
    const amount = calculateLineAmount(weightTon, unitPrice)
    if (amount <= remainingAmount && weightTon <= maxWeightTon) {
      return { quantity, amount, weightTon }
    }
    quantity -= 1
  }

  return { quantity: 0, amount: 0, weightTon: 0 }
}

export function buildInvoiceIssueAllocation(items: ModuleLineItem[], targetAmount: number) {
  const totalAvailableAmount = roundNumber(
    items.reduce((sum, item) => sum + getInvoiceIssueItemMaxAmount(item), 0),
    2,
  )

  if (roundNumber(targetAmount, 2) <= 0) {
    const patches = items.map((item) => ({
      id: String(item.id || ''),
      quantity: getInvoiceIssueItemMaxQuantity(item),
      weightTon: getInvoiceIssueItemMaxWeightTon(item),
      amount: getInvoiceIssueItemMaxAmount(item),
    }))
    return {
      appliedAmount: roundNumber(patches.reduce((sum, item) => sum + item.amount, 0), 2),
      normalizedTargetAmount: 0,
      patches,
    } satisfies InvoiceIssueAllocationResult
  }

  let remainingAmount = Math.min(roundNumber(targetAmount, 2), totalAvailableAmount)
  const patches = items.map((item) => {
    const maxQuantity = getInvoiceIssueItemMaxQuantity(item)
    const maxAmount = getInvoiceIssueItemMaxAmount(item)
    const maxWeightTon = getInvoiceIssueItemMaxWeightTon(item)
    const pieceWeightTon = roundNumber(item.pieceWeightTon, 3)
    const unitPrice = toSafeNumber(item.unitPrice)

    if (remainingAmount <= 0 || maxAmount <= 0 || maxWeightTon <= 0 || unitPrice <= 0) {
      return {
        id: String(item.id || ''),
        quantity: 0,
        weightTon: 0,
        amount: 0,
      }
    }

    if (remainingAmount >= maxAmount) {
      remainingAmount = roundNumber(remainingAmount - maxAmount, 2)
      return {
        id: String(item.id || ''),
        quantity: maxQuantity,
        weightTon: maxWeightTon,
        amount: maxAmount,
      }
    }

    const partialAllocation = pieceWeightTon > 0 && maxQuantity > 0
      ? buildQuantityBasedPartialAllocation(maxQuantity, maxWeightTon, pieceWeightTon, unitPrice, remainingAmount)
      : buildWeightOnlyPartialAllocation(maxWeightTon, unitPrice, remainingAmount)
    remainingAmount = roundNumber(remainingAmount - partialAllocation.amount, 2)
    return {
      id: String(item.id || ''),
      quantity: partialAllocation.quantity,
      weightTon: partialAllocation.weightTon,
      amount: partialAllocation.amount,
    }
  })

  const appliedAmount = roundNumber(patches.reduce((sum, item) => sum + item.amount, 0), 2)
  return {
    appliedAmount,
    normalizedTargetAmount: appliedAmount,
    patches,
  } satisfies InvoiceIssueAllocationResult
}
