import type { ModuleFormFieldOption, ModuleRecord } from '@/types/module-page'

interface CustomerStatementOptionArgs {
  currentStatementId?: number | null
  customerName?: string
  projectName?: string
}

interface CounterpartyStatementOptionArgs {
  currentStatementId?: number | null
  counterpartyName?: string
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function normalizeAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function normalizeId(value: unknown) {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}

function matchesFilter(actual: unknown, expected: string) {
  return !expected || normalizeText(actual) === expected
}

function keepCurrentOrOpenBalance(record: ModuleRecord, balanceField: string, currentStatementId?: number | null) {
  const recordId = normalizeId(record.id)
  if (recordId !== null && recordId === currentStatementId) {
    return true
  }
  return normalizeAmount(record[balanceField]) > 0
}

function compareStatements(left: ModuleRecord, right: ModuleRecord) {
  const leftEndDate = Date.parse(String(left.endDate || left.startDate || ''))
  const rightEndDate = Date.parse(String(right.endDate || right.startDate || ''))
  if (Number.isFinite(leftEndDate) && Number.isFinite(rightEndDate) && leftEndDate !== rightEndDate) {
    return rightEndDate - leftEndDate
  }
  return String(right.statementNo || '').localeCompare(String(left.statementNo || ''))
}

function formatAmountLabel(value: unknown) {
  return normalizeAmount(value).toFixed(2)
}

export function buildCustomerStatementOptions(
  statements: ModuleRecord[],
  args: CustomerStatementOptionArgs = {},
) {
  const customerName = normalizeText(args.customerName)
  const projectName = normalizeText(args.projectName)

  return [...statements]
    .filter((record) => keepCurrentOrOpenBalance(record, 'closingAmount', args.currentStatementId))
    .filter((record) => matchesFilter(record.customerName, customerName))
    .filter((record) => matchesFilter(record.projectName, projectName))
    .sort(compareStatements)
    .map<ModuleFormFieldOption>((record) => ({
      value: Number(record.id),
      label: `${String(record.statementNo || '')} | ${String(record.customerName || '')} / ${String(record.projectName || '')} | 待收 ${formatAmountLabel(record.closingAmount)}`,
    }))
}

export function buildSupplierStatementOptions(
  statements: ModuleRecord[],
  args: CounterpartyStatementOptionArgs = {},
) {
  const counterpartyName = normalizeText(args.counterpartyName)

  return [...statements]
    .filter((record) => keepCurrentOrOpenBalance(record, 'closingAmount', args.currentStatementId))
    .filter((record) => matchesFilter(record.supplierName, counterpartyName))
    .sort(compareStatements)
    .map<ModuleFormFieldOption>((record) => ({
      value: Number(record.id),
      label: `${String(record.statementNo || '')} | ${String(record.supplierName || '')} | 待付 ${formatAmountLabel(record.closingAmount)}`,
    }))
}

export function buildFreightStatementOptions(
  statements: ModuleRecord[],
  args: CounterpartyStatementOptionArgs = {},
) {
  const counterpartyName = normalizeText(args.counterpartyName)

  return [...statements]
    .filter((record) => keepCurrentOrOpenBalance(record, 'unpaidAmount', args.currentStatementId))
    .filter((record) => matchesFilter(record.carrierName, counterpartyName))
    .sort(compareStatements)
    .map<ModuleFormFieldOption>((record) => ({
      value: Number(record.id),
      label: `${String(record.statementNo || '')} | ${String(record.carrierName || '')} | 待付 ${formatAmountLabel(record.unpaidAmount)}`,
    }))
}

export function findStatementRecordById(records: ModuleRecord[], statementId: unknown) {
  const normalizedId = normalizeId(statementId)
  if (normalizedId === null) {
    return null
  }
  return records.find((record) => normalizeId(record.id) === normalizedId) || null
}
