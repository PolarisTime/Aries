import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { http } from './client'

export interface SupplierOption {
  id?: string
  value: string
  label: string
}

let cachedSuppliers: SupplierOption[] | null = null
let fetchFailed = false
let loadingSuppliers: Promise<SupplierOption[]> | null = null

export async function fetchSupplierOptions(): Promise<SupplierOption[]> {
  if (cachedSuppliers !== null) return cachedSuppliers
  if (loadingSuppliers) return loadingSuppliers

  loadingSuppliers = (async () => {
    const response = await http.get<ApiResponse<SupplierOption[]>>(
      ENDPOINTS.SUPPLIERS_OPTIONS,
    )
    cachedSuppliers = normalizeSupplierOptions(response.data || [])
    fetchFailed = false
    return cachedSuppliers
  })()

  try {
    return await loadingSuppliers
  } catch {
    fetchFailed = true
    return []
  } finally {
    loadingSuppliers = null
  }
}

export function getSupplierOptions(): SupplierOption[] {
  if (cachedSuppliers === null && !loadingSuppliers && !fetchFailed) {
    fetchSupplierOptions()
  }
  return cachedSuppliers || []
}

export function reloadSupplierOptions() {
  cachedSuppliers = null
  fetchFailed = false
  loadingSuppliers = null
  return fetchSupplierOptions()
}

function normalizeSupplierOptions(options: SupplierOption[]): SupplierOption[] {
  return options.map((option) => ({
    ...option,
    id: option.id == null ? undefined : String(option.id),
    label: String(option.label || ''),
    value: String(option.value || ''),
  }))
}
