import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { shallowRef } from 'vue'

export interface WarehouseOption {
  value: string
  label: string
}

const cachedWarehouses = shallowRef<WarehouseOption[] | null>(null)
let fetchFailed = false
let loadingWarehouses: Promise<WarehouseOption[]> | null = null

export async function fetchWarehouseOptions(): Promise<WarehouseOption[]> {
  if (cachedWarehouses.value !== null) return cachedWarehouses.value
  if (loadingWarehouses) return loadingWarehouses

  loadingWarehouses = (async () => {
    const response = await http.get<ApiResponse<WarehouseOption[]>>(ENDPOINTS.WAREHOUSES_OPTIONS)
    cachedWarehouses.value = normalizeWarehouseOptions(response.data || [])
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
  if (cachedWarehouses.value === null && !loadingWarehouses) {
    if (fetchFailed) {
      fetchFailed = false
    }
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
