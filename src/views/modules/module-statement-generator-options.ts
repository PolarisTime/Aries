import type { CarrierOption } from '@/api/carrier-options'
import type { CustomerOption } from '@/api/customer-options'
import type { SupplierOption } from '@/api/supplier-options'

export type StatementCounterpartyType = 'supplier' | 'customer' | 'freight'

export interface StatementCounterpartyOption {
  label: string
  value: string
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function dedupeOptions(options: StatementCounterpartyOption[]) {
  const seen = new Set<string>()

  return options.flatMap((option) => {
    const value = normalizeText(option.value)
    if (!value || seen.has(value)) {
      return []
    }

    seen.add(value)
    return [
      {
        label: normalizeText(option.label) || value,
        value,
      },
    ]
  })
}

function buildNamedCounterpartyOptions(
  rows: Array<SupplierOption | CarrierOption>,
) {
  return dedupeOptions(
    rows.map((row) => {
      const value = normalizeText(row.value || row.label)
      return {
        label: normalizeText(row.label) || value,
        value,
      }
    }),
  )
}

function buildCustomerCounterpartyOptions(rows: CustomerOption[]) {
  return dedupeOptions(
    rows.map((row) => {
      const customerName = normalizeText(
        row.customerName || row.value || row.label,
      )
      return {
        label: customerName,
        value: customerName,
      }
    }),
  )
}

export function buildStatementCounterpartyOptions(
  statementType: StatementCounterpartyType,
  rows: SupplierOption[] | CustomerOption[] | CarrierOption[],
) {
  if (statementType === 'customer') {
    return buildCustomerCounterpartyOptions(rows as CustomerOption[])
  }

  return buildNamedCounterpartyOptions(
    rows as Array<SupplierOption | CarrierOption>,
  )
}

export function filterStatementCounterpartyOptions(
  options: StatementCounterpartyOption[],
  keyword: string,
) {
  const normalizedKeyword = normalizeText(keyword).toLowerCase()
  if (!normalizedKeyword) {
    return options
  }

  return options.filter((option) => {
    const label = normalizeText(option.label).toLowerCase()
    const value = normalizeText(option.value).toLowerCase()
    return label.includes(normalizedKeyword) || value.includes(normalizedKeyword)
  })
}
