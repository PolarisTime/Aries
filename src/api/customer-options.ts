import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface CustomerOption {
  value: string
  label: string
}

let cachedCustomers: CustomerOption[] | null = null

export async function fetchCustomerOptions(): Promise<CustomerOption[]> {
  if (cachedCustomers) return cachedCustomers
  try {
    const response = await http.get<ApiResponse<CustomerOption[]>>(ENDPOINTS.CUSTOMERS_OPTIONS)
    cachedCustomers = response.data || []
    return cachedCustomers
  } catch {
    return []
  }
}
