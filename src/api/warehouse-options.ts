import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface WarehouseOption {
  value: string
  label: string
}

let cachedWarehouses: WarehouseOption[] | null = null

export async function fetchWarehouseOptions(): Promise<WarehouseOption[]> {
  if (cachedWarehouses) return cachedWarehouses
  try {
    const response = await http.get<ApiResponse<WarehouseOption[]>>(ENDPOINTS.WAREHOUSES_OPTIONS)
    cachedWarehouses = response.data || []
    return cachedWarehouses
  } catch {
    return []
  }
}
