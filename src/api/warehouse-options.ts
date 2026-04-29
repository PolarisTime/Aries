import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface WarehouseOption {
  value: string
  label: string
}

let cachedWarehouses: WarehouseOption[] | null = null
let fetchFailed = false

export async function fetchWarehouseOptions(): Promise<WarehouseOption[]> {
  if (cachedWarehouses && cachedWarehouses.length > 0) return cachedWarehouses
  try {
    const response = await http.get<ApiResponse<WarehouseOption[]>>(ENDPOINTS.WAREHOUSES_OPTIONS)
    cachedWarehouses = response.data || []
    fetchFailed = false
    return cachedWarehouses
  } catch {
    fetchFailed = true
    return []
  }
}

export function getWarehouseOptions(): WarehouseOption[] {
  if (fetchFailed || (cachedWarehouses && cachedWarehouses.length === 0)) {
    cachedWarehouses = null
    fetchFailed = false
    fetchWarehouseOptions()
  }
  return cachedWarehouses || []
}

export function reloadWarehouseOptions() {
  cachedWarehouses = null
  fetchFailed = false
  return fetchWarehouseOptions()
}
