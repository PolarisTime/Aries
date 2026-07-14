import { parseOptionalEntityId } from '@/types/entity-id'
import type {
  ModuleFormFieldOption,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

interface CustomerStatementOptionArgs {
  currentStatementId?: string | null
  customerId?: string
  projectId?: string
  settlementCompanyId?: string
}

interface CounterpartyStatementOptionArgs {
  currentStatementId?: string | null
  counterpartyId?: string
}

export interface StatementLinkCatalog {
  customerStatements: ModuleRecord[]
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
  return parseOptionalEntityId(value, 'statementId') ?? null
}

function matchesIdentity(actual: unknown, expected: string | null) {
  return expected === null || normalizeId(actual) === expected
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
  const customerId = normalizeId(args.customerId)
  const projectId = normalizeId(args.projectId)
  const settlementCompanyId = normalizeId(args.settlementCompanyId)

  return [...statements]
    .filter(
      (record) =>
        normalizeId(record.id) !== null &&
        keepCurrentOrOpenBalance(
          record,
          'closingAmount',
          args.currentStatementId,
        ) &&
        matchesIdentity(record.customerId, customerId) &&
        matchesIdentity(record.projectId, projectId) &&
        matchesIdentity(record.settlementCompanyId, settlementCompanyId),
    )
    .sort(compareStatements)
    .map<ModuleFormFieldOption>((record) => ({
      value: normalizeId(record.id)!,
      label: `${asString(record.statementNo)} | ${asString(record.customerName)} / ${asString(record.projectName)} | 待收 ${formatAmountLabel(record.closingAmount)}`,
      settlementCompanyId: asString(record.settlementCompanyId),
      settlementCompanyName: asString(record.settlementCompanyName),
    }))
}

function buildFreightStatementOptions(
  statements: ModuleRecord[],
  args: CounterpartyStatementOptionArgs = {},
) {
  const counterpartyId = normalizeId(args.counterpartyId)

  return [...statements]
    .filter(
      (record) =>
        normalizeId(record.id) !== null &&
        keepCurrentOrOpenBalance(
          record,
          'unpaidAmount',
          args.currentStatementId,
        ) &&
        matchesIdentity(record.carrierId, counterpartyId),
    )
    .sort(compareStatements)
    .map<ModuleFormFieldOption>((record) => ({
      value: normalizeId(record.id)!,
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
  if (moduleKey === 'receipt') {
    return buildCustomerStatementOptions(catalog.customerStatements, {
      currentStatementId: normalizeId(form?.sourceCustomerStatementId),
      customerId: normalizeId(form?.customerId) ?? undefined,
      projectId: normalizeId(form?.projectId) ?? undefined,
      settlementCompanyId: normalizeId(form?.settlementCompanyId) ?? undefined,
    })
  }

  const counterpartyType = normalizeText(form?.counterpartyType)
  const counterpartyId = normalizeId(form?.counterpartyId) ?? undefined

  if (counterpartyType === '物流商') {
    return buildFreightStatementOptions(catalog.freightStatements, {
      currentStatementId: normalizeId(form?.sourceFreightStatementId),
      counterpartyId,
    })
  }

  return []
}
