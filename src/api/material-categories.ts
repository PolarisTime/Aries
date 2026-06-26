import { ENDPOINTS } from '@/constants/endpoints'
import { createCachedOptions } from '@/lib/create-cached-options'

export type MaterialCategoryOption = {
  value: string
  label: string
  purchaseWeighRequired?: boolean
  purchaseWeighOverTolerancePercent?: number
  purchaseWeighUnderTolerancePercent?: number
}

const cached = createCachedOptions<MaterialCategoryOption>({
  endpoint: ENDPOINTS.MATERIAL_CATEGORIES,
})

export const fetchMaterialCategories = cached.fetch
export const reloadMaterialCategories = cached.reload
