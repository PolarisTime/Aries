import type {
  ModuleFormFieldOption,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

interface CustomerStatementOptionArgs {
  currentStatementId?: string | null
  customerName?: string
  projectName?: string
}

interface CounterpartyStatementOptionArgs {
  currentStatementId?: string | null
  counterpartyName?: string
}

export interface StatementLinkCatalog {
  customerStatements: ModuleRecord[]
  supplierStatements: ModuleRecord[]
  freightStatements: ModuleRecord[]
}

function normalizeText(value: unknown) {
  return asString(value).trim()
}

function normalizeAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function normalizeId(value: unknown) {
  const id = asString(value).trim()
  return id ? id : null
}

function matchesFilter(actual: unknown, expected: string) {
  return !expected || normalizeText(actual) === expected
}

function keepCurrentOrOpenBalance(
  record: ModuleRecord,
  balanceField: string,
  currentStatementId?: string | null,
) {
  const recordId = normalizeId(record.id)
  if (recordId !== null && recordId === currentStatementId) {
    return true
  }
  return normalizeAmount(record[balanceField]) > 0
}

function compareStatements(left: ModuleRecord, right: ModuleRecord) {
  const leftEndDate = Date.parse(asString(left.endDate))
  const rightEndDate = Date.parse(asString(right.endDate))
  if (
    Number.isFinite(leftEndDate) &&
    Number.isFinite(rightEndDate) &&
    leftEndDate !== rightEndDate
  ) {
    return rightEndDate - leftEndDate
  }
  return asString(right.statementNo).localeCompare(asString(left.statementNo))
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
    .filter((record) =>
      keepCurrentOrOpenBalance(
        record,
        'closingAmount',
        args.currentStatementId,
      ),
    )
    .filter((record) => matchesFilter(record.customerName, customerName))
    .filter((record) => matchesFilter(record.projectName, projectName))
    .sort(compareStatements)
    .map<ModuleFormFieldOption>((record) => ({
      value: String(record.id || ''),
      label: `${asString(record.statementNo)} | ${asString(record.customerName)} / ${asString(record.projectName)} | 待收 ${formatAmountLabel(record.closingAmount)}`,
    }))
}

function buildSupplierStatementOptions(
  statements: ModuleRecord[],
  args: CounterpartyStatementOptionArgs = {},
) {
  const counterpartyName = normalizeText(args.counterpartyName)

  return [...statements]
    .filter((record) =>
      keepCurrentOrOpenBalance(
        record,
        'closingAmount',
        args.currentStatementId,
      ),
    )
    .filter((record) => matchesFilter(record.supplierName, counterpartyName))
    .sort(compareStatements)
    .map<ModuleFormFieldOption>((record) => ({
      value: String(record.id || ''),
      label: `${asString(record.statementNo)} | ${asString(record.supplierName)} | 待付 ${formatAmountLabel(record.closingAmount)}`,
    }))
}

function buildFreightStatementOptions(
  statements: ModuleRecord[],
  args: CounterpartyStatementOptionArgs = {},
) {
  const counterpartyName = normalizeText(args.counterpartyName)

  return [...statements]
    .filter((record) =>
      keepCurrentOrOpenBalance(record, 'unpaidAmount', args.currentStatementId),
    )
    .filter((record) => matchesFilter(record.carrierName, counterpartyName))
    .sort(compareStatements)
    .map<ModuleFormFieldOption>((record) => ({
      value: String(record.id || ''),
      label: `${asString(record.statementNo)} | ${asString(record.carrierName)} | 待付 ${formatAmountLabel(record.unpaidAmount)}`,
    }))
}

export function findStatementRecordById(
  records: ModuleRecord[],
  statementId: unknown,
) {
  const normalizedId = normalizeId(statementId)
  if (normalizedId === null) {
    return null
  }
  return (
    records.find((record) => normalizeId(record.id) === normalizedId) || null
  )
}

export function buildStatementLinkOptions(
  moduleKey: 'receipt' | 'payment',
  form: ModuleRecordInput | undefined,
  catalog: StatementLinkCatalog,
) {
  const currentStatementId = normalizeId(form?.sourceStatementId)

  if (moduleKey === 'receipt') {
    return buildCustomerStatementOptions(catalog.customerStatements, {
      currentStatementId,
      customerName: normalizeText(form?.customerName),
      projectName: normalizeText(form?.projectName),
    })
  }

  const counterpartyName = normalizeText(form?.counterpartyName)
  const businessType = normalizeText(form?.businessType)

  if (businessType === '供应商') {
    return buildSupplierStatementOptions(catalog.supplierStatements, {
      currentStatementId,
      counterpartyName,
    })
  }

  if (businessType === '物流商') {
    return buildFreightStatementOptions(catalog.freightStatements, {
      currentStatementId,
      counterpartyName,
    })
  }

  return []
}
