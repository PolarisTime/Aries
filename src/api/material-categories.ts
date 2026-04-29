import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface MaterialCategoryOption {
  value: string
  label: string
  purchaseWeighRequired?: boolean
}

let cachedCategories: MaterialCategoryOption[] | null = null

export async function fetchMaterialCategories(): Promise<MaterialCategoryOption[]> {
  if (cachedCategories) return cachedCategories
  try {
    const response = await http.get<ApiResponse<MaterialCategoryOption[]>>(ENDPOINTS.MATERIAL_CATEGORIES)
    cachedCategories = response.data || []
    return cachedCategories
  } catch {
    return []
  }
}

export function getCachedMaterialCategories(): MaterialCategoryOption[] {
  return cachedCategories || []
}

export function reloadMaterialCategories() {
  cachedCategories = null
  return fetchMaterialCategories()
}
