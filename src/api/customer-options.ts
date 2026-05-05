import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface CustomerOption {
  id?: string | number
  value: string
  label: string
  customerCode?: string
  customerName?: string
  projectName?: string
  projectNameAbbr?: string
}

let cachedCustomers: CustomerOption[] | null = null
let fetchFailed = false
let loadingCustomers: Promise<CustomerOption[]> | null = null

export async function fetchCustomerOptions(): Promise<CustomerOption[]> {
  if (cachedCustomers !== null) return cachedCustomers
  if (loadingCustomers) return loadingCustomers

  loadingCustomers = (async () => {
    const response = await http.get<ApiResponse<CustomerOption[]>>(ENDPOINTS.CUSTOMERS_OPTIONS)
    cachedCustomers = normalizeCustomerRows(response.data || [])
    fetchFailed = false
    return cachedCustomers
  })()

  try {
    return await loadingCustomers
  } catch {
    fetchFailed = true
    return []
  } finally {
    loadingCustomers = null
  }
}

export function getCustomerOptions(): CustomerOption[] {
  ensureCustomerOptionsLoaded()
  return uniqueCustomerNameOptions(cachedCustomers || [])
}

export function getCustomerProjectOptions(form?: Record<string, unknown>): CustomerOption[] {
  ensureCustomerOptionsLoaded()
  const customerName = normalizeText(form?.customerName)
  const rows = cachedCustomers || []
  const filteredRows = customerName
    ? rows.filter((row) => normalizeText(row.customerName || row.value) === customerName)
    : rows
  return uniqueProjectOptions(filteredRows, !customerName)
}

export function findCustomerOption(customerName: unknown, projectName?: unknown): CustomerOption | undefined {
  ensureCustomerOptionsLoaded()
  const normalizedCustomer = normalizeText(customerName)
  const normalizedProject = normalizeText(projectName)
  if (!normalizedCustomer && !normalizedProject) {
    return undefined
  }
  const rows = cachedCustomers || []
  return rows.find((row) =>
    (!normalizedCustomer || normalizeText(row.customerName || row.value) === normalizedCustomer)
    && (!normalizedProject || normalizeText(row.projectName) === normalizedProject),
  )
}

export function resolveSingleCustomerProjectName(customerName: unknown): string {
  ensureCustomerOptionsLoaded()
  const normalizedCustomer = normalizeText(customerName)
  if (!normalizedCustomer) {
    return ''
  }
  const projects = uniqueProjectOptions(
    (cachedCustomers || []).filter((row) => normalizeText(row.customerName || row.value) === normalizedCustomer),
    false,
  )
  return projects.length === 1 ? String(projects[0].value || '') : ''
}

function ensureCustomerOptionsLoaded() {
  if (cachedCustomers === null && !loadingCustomers) {
    if (fetchFailed) {
      fetchFailed = false
    }
    fetchCustomerOptions()
  }
}

function normalizeCustomerRows(rows: CustomerOption[]) {
  return rows
    .map((row) => {
      const customerName = normalizeText(row.customerName || row.value || row.label)
      const projectName = normalizeText(row.projectName)
      return {
        ...row,
        value: customerName,
        label: row.label || (projectName ? `${customerName} / ${projectName}` : customerName),
        customerName,
        projectName,
      }
    })
    .filter((row) => row.customerName)
}

function uniqueCustomerNameOptions(rows: CustomerOption[]) {
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

function uniqueProjectOptions(rows: CustomerOption[], includeCustomerInLabel: boolean) {
  const seen = new Set<string>()
  return rows.flatMap((row) => {
    const projectName = normalizeText(row.projectName)
    if (!projectName || seen.has(projectName)) {
      return []
    }
    seen.add(projectName)
    const customerName = normalizeText(row.customerName || row.value)
    const projectLabel = formatProjectOptionLabel(row, projectName)
    return [{
      label: includeCustomerInLabel ? `${projectLabel} / ${customerName}` : projectLabel,
      value: projectName,
      customerName,
      projectName,
      customerCode: row.customerCode,
      projectNameAbbr: row.projectNameAbbr,
    }]
  })
}

function formatProjectOptionLabel(row: CustomerOption, projectName: string) {
  const projectNameAbbr = normalizeText(row.projectNameAbbr)
  return projectNameAbbr ? `${projectNameAbbr}（${projectName}）` : projectName
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

export function reloadCustomerOptions() {
  cachedCustomers = null
  fetchFailed = false
  loadingCustomers = null
  return fetchCustomerOptions()
}
