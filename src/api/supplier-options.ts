import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface SupplierOption {
  value: string
  label: string
}

let cachedSuppliers: SupplierOption[] | null = null
let fetchFailed = false

export async function fetchSupplierOptions(): Promise<SupplierOption[]> {
  if (cachedSuppliers && cachedSuppliers.length > 0) return cachedSuppliers
  try {
    const response = await http.get<ApiResponse<SupplierOption[]>>(ENDPOINTS.SUPPLIERS_OPTIONS)
    cachedSuppliers = response.data || []
    fetchFailed = false
    return cachedSuppliers
  } catch {
    fetchFailed = true
    return []
  }
}

export function getSupplierOptions(): SupplierOption[] {
  if (fetchFailed || (cachedSuppliers && cachedSuppliers.length === 0)) {
    cachedSuppliers = null
    fetchFailed = false
    fetchSupplierOptions()
  }
  return cachedSuppliers || []
}
