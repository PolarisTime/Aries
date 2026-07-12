import type {
  PaymentPrepaymentAllocation,
  PaymentPrepaymentAllocationInput,
} from '@/api/payment-prepayment-allocations'
import type { ModuleRecord } from '@/types/module-page'
import { asNumber, asString } from '@/utils/type-narrowing'

function toCents(value: unknown) {
  return Math.round((asNumber(value) + Number.EPSILON) * 100)
}

export interface PrepaymentStatementOption {
  value: string
  label: string
  availableAmount: number
}

export interface PrepaymentAllocationValidationMessages {
  statementRequired: (lineNumber: number) => string
  positiveAmountRequired: (lineNumber: number) => string
  statementAmountExceeded: (lineNumber: number) => string
  duplicateStatement: string
  paymentAmountExceeded: string
}

type PrepaymentStatementOptionLabelFormatter = (
  statementNo: string,
  availableAmount: number,
) => string

export function summarizePrepaymentAllocations(
  paymentAmount: unknown,
  items: PaymentPrepaymentAllocationInput[],
) {
  const paymentCents = toCents(paymentAmount)
  const allocatedCents = items.reduce(
    (sum, item) => sum + toCents(item.allocatedAmount),
    0,
  )
  return {
    paymentAmount: paymentCents / 100,
    allocatedAmount: allocatedCents / 100,
    remainingAmount: (paymentCents - allocatedCents) / 100,
  }
}

export function validatePrepaymentAllocations(
  paymentAmount: unknown,
  items: PaymentPrepaymentAllocationInput[],
  availableAmountByStatementId: ReadonlyMap<string, number>,
  messages: PrepaymentAllocationValidationMessages,
) {
  const statementIds = new Set<string>()
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    const statementId = asString(item.sourceSupplierStatementId).trim()
    if (!statementId) {
      return messages.statementRequired(index + 1)
    }
    if (asNumber(item.allocatedAmount) <= 0) {
      return messages.positiveAmountRequired(index + 1)
    }
    const availableAmount = availableAmountByStatementId.get(statementId)
    if (
      availableAmount !== undefined &&
      toCents(item.allocatedAmount) > toCents(availableAmount)
    ) {
      return messages.statementAmountExceeded(index + 1)
    }
    if (statementIds.has(statementId)) {
      return messages.duplicateStatement
    }
    statementIds.add(statementId)
  }

  return summarizePrepaymentAllocations(paymentAmount, items).remainingAmount <
    0
    ? messages.paymentAmountExceeded
    : null
}

export function buildPrepaymentStatementOptions(
  candidates: ModuleRecord[],
  currentAllocations: PaymentPrepaymentAllocation[],
  formatOptionLabel: PrepaymentStatementOptionLabelFormatter,
): PrepaymentStatementOption[] {
  const allocationsByStatementId = new Map(
    currentAllocations.map((allocation) => [
      allocation.sourceSupplierStatementId,
      allocation,
    ]),
  )
  const options = new Map<string, PrepaymentStatementOption>()

  for (const candidate of candidates) {
    const statementId = asString(candidate.id).trim()
    if (!statementId) continue
    const allocation = allocationsByStatementId.get(statementId)
    const availableAmount =
      asNumber(candidate.closingAmount) + asNumber(allocation?.allocatedAmount)
    const statementNo = asString(candidate.statementNo).trim() || statementId
    options.set(statementId, {
      value: statementId,
      label: formatOptionLabel(statementNo, availableAmount),
      availableAmount,
    })
  }

  for (const allocation of currentAllocations) {
    if (options.has(allocation.sourceSupplierStatementId)) continue
    const availableAmount =
      allocation.statementBalanceAmount + allocation.allocatedAmount
    options.set(allocation.sourceSupplierStatementId, {
      value: allocation.sourceSupplierStatementId,
      label: formatOptionLabel(
        allocation.statementNo || allocation.sourceSupplierStatementId,
        availableAmount,
      ),
      availableAmount,
    })
  }

  return Array.from(options.values())
}
