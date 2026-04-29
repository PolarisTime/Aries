import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface WarehouseOption {
  value: string
  label: string
}

let cached: WarehouseOption[] | null = null
let fetchFailed = false

export async function fetchWarehouseOptions(): Promise<WarehouseOption[]> {
  if (cached && cached.length > 0) return cached
  try {
    const response = await http.get<ApiResponse<WarehouseOption[]>>(ENDPOINTS.WAREHOUSES_OPTIONS)
    cached = response.data || []
    fetchFailed = false
    return cached
  } catch {
    fetchFailed = true
    return []
  }
}

export function getWarehouseOptions(): WarehouseOption[] {
  if (fetchFailed || (cached && cached.length === 0)) {
    cached = null
    fetchFailed = false
    fetchWarehouseOptions()
  }
  return cached || []
}
