import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'

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

export async function fetchMaterialCategories(): Promise<
  MaterialCategoryOption[]
> {
  return apiGet(
    ENDPOINTS.MATERIAL_CATEGORIES,
    z.array(materialCategoryOptionSchema),
  )
}
