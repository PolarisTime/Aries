import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface CustomerOption {
  value: string
  label: string
}

let cachedCustomers: CustomerOption[] | null = null
let fetchFailed = false

export async function fetchCustomerOptions(): Promise<CustomerOption[]> {
  if (cachedCustomers && cachedCustomers.length > 0) return cachedCustomers
  try {
    const response = await http.get<ApiResponse<CustomerOption[]>>(ENDPOINTS.CUSTOMERS_OPTIONS)
    cachedCustomers = response.data || []
    fetchFailed = false
    return cachedCustomers
  } catch {
    fetchFailed = true
    return []
  }
}

export function getCustomerOptions(): CustomerOption[] {
  if (fetchFailed || (cachedCustomers && cachedCustomers.length === 0)) {
    cachedCustomers = null
    fetchFailed = false
    fetchCustomerOptions()
  }
  return cachedCustomers || []
}

export function reloadCustomerOptions() {
  cachedCustomers = null
  fetchFailed = false
  return fetchCustomerOptions()
}
