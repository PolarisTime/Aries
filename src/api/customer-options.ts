import { ENDPOINTS } from '@/constants/endpoints'
import { createCachedOptions } from '@/lib/create-cached-options'
import type { ModuleRecordInput } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export type CustomerOption = {
  id?: string
  value: string
  label: string
  customerCode?: string
  customerName?: string
  projectName?: string
  projectNameAbbr?: string
}

export function normalizeText(value: unknown) {
  return asString(value).trim()
}

export function normalizeCustomerRows(rows: CustomerOption[]) {
  return rows.flatMap((row) => {
    const customerName = normalizeText(
      row.customerName || row.value || row.label,
    )
    const projectName = normalizeText(row.projectName)
    return customerName
      ? [
          {
            ...row,
            id: row.id == null ? undefined : String(row.id),
            value: customerName,
            label:
              row.label ||
              (projectName ? `${customerName} / ${projectName}` : customerName),
            customerName,
            projectName,
          },
        ]
      : []
  })
}

const cached = createCachedOptions<CustomerOption>({
  endpoint: ENDPOINTS.CUSTOMERS_OPTIONS,
  normalizer: normalizeCustomerRows,
})

export const fetchCustomerOptions = cached.fetch
export const reloadCustomerOptions = cached.reload

export function getCustomerOptions(): CustomerOption[] {
  return uniqueCustomerNameOptions(cached.get())
}

export function getCustomerProjectOptions(
  form?: ModuleRecordInput,
): CustomerOption[] {
  const customerName = normalizeText(form?.customerName)
  const rows = cached.get()
  const filteredRows = customerName
    ? rows.filter(
        (row) => normalizeText(row.customerName || row.value) === customerName,
      )
    : rows
  return uniqueProjectOptions(filteredRows, !customerName)
}



export function uniqueCustomerNameOptions(rows: CustomerOption[]) {
  const seen = new Set<string>()
  return rows.flatMap((row) => {
    const customerName = normalizeText(row.customerName || row.value)
    if (!customerName || seen.has(customerName)) {
      return []
    }
    seen.add(customerName)
    return [{ label: customerName, value: customerName }]
  })
}

export function uniqueProjectOptions(
  rows: CustomerOption[],
  includeCustomerInLabel: boolean,
) {
  const seen = new Set<string>()
  return rows.flatMap((row) => {
    const projectName = normalizeText(row.projectName)
    if (!projectName || seen.has(projectName)) {
      return []
    }
    seen.add(projectName)
    const customerName = normalizeText(row.customerName || row.value)
    const projectLabel = formatProjectOptionLabel(row, projectName)
    return [
      {
        label: includeCustomerInLabel
          ? `${projectLabel} / ${customerName}`
          : projectLabel,
        value: projectName,
        customerName,
        projectName,
        customerCode: row.customerCode,
        projectNameAbbr: row.projectNameAbbr,
      },
    ]
  })
}

export function formatProjectOptionLabel(row: CustomerOption, projectName: string) {
  const projectNameAbbr = normalizeText(row.projectNameAbbr)
  return projectNameAbbr ? `${projectNameAbbr}（${projectName}）` : projectName
}
