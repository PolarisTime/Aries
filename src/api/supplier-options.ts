import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface SupplierOption {
  value: string
  label: string
}

let cachedSuppliers: SupplierOption[] | null = null

export async function fetchSupplierOptions(): Promise<SupplierOption[]> {
  if (cachedSuppliers) return cachedSuppliers
  try {
    const response = await http.get<ApiResponse<SupplierOption[]>>(ENDPOINTS.SUPPLIERS_OPTIONS)
    cachedSuppliers = response.data || []
    return cachedSuppliers
  } catch {
    return []
  }
}
