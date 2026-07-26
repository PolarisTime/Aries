import { z } from 'zod'
import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/lib/query-cached-options'

export type MaterialCategoryOption = {
  value: string
  label: string
  purchaseWeighRequired?: boolean
}

const materialCategoryOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  purchaseWeighRequired: z.boolean().optional(),
})

const cached = createQueryCachedOptions<MaterialCategoryOption>({
  endpoint: ENDPOINTS.MATERIAL_CATEGORIES,
  queryKey: QUERY_KEYS.masterOptions.materialCategories,
  itemSchema: materialCategoryOptionSchema,
})

export const fetchMaterialCategories = cached.fetch
export const reloadMaterialCategories = cached.reload
