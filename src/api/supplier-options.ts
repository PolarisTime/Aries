import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface SupplierOption {
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
    const response = await http.get<ApiResponse<SupplierOption[]>>(ENDPOINTS.SUPPLIERS_OPTIONS)
    cachedSuppliers = response.data || []
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
