import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface CustomerOption {
  value: string
  label: string
}

let cached: CustomerOption[] | null = null
let fetchFailed = false

export async function fetchCustomerOptions(): Promise<CustomerOption[]> {
  if (cached && cached.length > 0) return cached
  try {
    const response = await http.get<ApiResponse<CustomerOption[]>>(ENDPOINTS.CUSTOMERS_OPTIONS)
    cached = response.data || []
    fetchFailed = false
    return cached
  } catch {
    fetchFailed = true
    return []
  }
}

export function getCustomerOptions(): CustomerOption[] {
  if (fetchFailed || (cached && cached.length === 0)) {
    cached = null
    fetchFailed = false
    fetchCustomerOptions()
  }
  return cached || []
}
