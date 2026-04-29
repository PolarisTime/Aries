import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { shallowRef } from 'vue'

export interface SupplierOption {
  value: string
  label: string
}

const cachedSuppliers = shallowRef<SupplierOption[] | null>(null)
let fetchFailed = false
let loadingSuppliers: Promise<SupplierOption[]> | null = null

export async function fetchSupplierOptions(): Promise<SupplierOption[]> {
  if (cachedSuppliers.value !== null) return cachedSuppliers.value
  if (loadingSuppliers) return loadingSuppliers

  loadingSuppliers = (async () => {
    const response = await http.get<ApiResponse<SupplierOption[]>>(ENDPOINTS.SUPPLIERS_OPTIONS)
    cachedSuppliers.value = response.data || []
    fetchFailed = false
    return cachedSuppliers.value
  })()

  try {
    return await loadingSuppliers
  } catch {
    fetchFailed = true
    return []
  } finally {
    loadingSuppliers = null
  }
}

export function getSupplierOptions(): SupplierOption[] {
  if (cachedSuppliers.value === null && !loadingSuppliers) {
    if (fetchFailed) {
      fetchFailed = false
    }
    fetchSupplierOptions()
  }
  return cachedSuppliers.value || []
}

export function reloadSupplierOptions() {
  cachedSuppliers.value = null
  fetchFailed = false
  loadingSuppliers = null
  return fetchSupplierOptions()
}
