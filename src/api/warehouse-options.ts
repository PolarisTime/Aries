import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { http } from './client'

export interface WarehouseOption {
  value: string
  label: string
}

const cachedWarehouses = shallowRef<WarehouseOption[] | null>(null)
let fetchFailed = false
let loadingWarehouses: Promise<WarehouseOption[]> | null = null

export async function fetchWarehouseOptions(): Promise<WarehouseOption[]> {
  if (cachedWarehouses && cachedWarehouses.length > 0) return cachedWarehouses
  try {
    const response = await http.get<ApiResponse<WarehouseOption[]>>(
      ENDPOINTS.WAREHOUSES_OPTIONS,
    )
    cachedWarehouses = response.data || []
    fetchFailed = false
    return cachedWarehouses.value
  })()

  try {
    return await loadingWarehouses
  } catch {
    fetchFailed = true
    return []
  } finally {
    loadingWarehouses = null
  }
}

export function getWarehouseOptions(): WarehouseOption[] {
  if (cachedWarehouses === null && !fetchFailed) {
    fetchWarehouseOptions()
  }
  return cachedWarehouses.value || []
}

export function reloadWarehouseOptions() {
  cachedWarehouses.value = null
  fetchFailed = false
  loadingWarehouses = null
  return fetchWarehouseOptions()
}

function normalizeWarehouseOptions(options: WarehouseOption[]) {
  return options
    .map((option) => ({
      label: String(option.label || option.value || '').trim(),
      value: String(option.value || option.label || '').trim(),
    }))
    .filter((option) => option.value)
}
