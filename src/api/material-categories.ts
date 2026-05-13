import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { http } from './client'

export interface MaterialCategoryOption {
  value: string
  label: string
  purchaseWeighRequired?: boolean
}

const cachedCategories = shallowRef<MaterialCategoryOption[] | null>(null)
let fetchFailed = false
let loadingCategories: Promise<MaterialCategoryOption[]> | null = null

export async function fetchMaterialCategories(): Promise<
  MaterialCategoryOption[]
> {
  if (cachedCategories) return cachedCategories
  try {
    const response = await http.get<ApiResponse<MaterialCategoryOption[]>>(
      ENDPOINTS.MATERIAL_CATEGORIES,
    )
    cachedCategories = response.data || []
    return cachedCategories
  } catch {
    fetchFailed = true
    return []
  } finally {
    loadingCategories = null
  }
}

export function getCachedMaterialCategories(): MaterialCategoryOption[] {
  return cachedCategories.value || []
}

export function getMaterialCategoryOptions(): MaterialCategoryOption[] {
  if (cachedCategories.value === null && !loadingCategories) {
    if (fetchFailed) {
      fetchFailed = false
    }
    fetchMaterialCategories()
  }
  return cachedCategories.value || []
}

export function reloadMaterialCategories() {
  cachedCategories.value = null
  fetchFailed = false
  loadingCategories = null
  return fetchMaterialCategories()
}

function normalizeMaterialCategories(options: MaterialCategoryOption[]) {
  return options
    .map((option) => ({
      ...option,
      label: String(option.label || option.value || '').trim(),
      value: String(option.value || option.label || '').trim(),
      purchaseWeighRequired: Boolean(option.purchaseWeighRequired),
    }))
    .filter((option) => option.value)
}
