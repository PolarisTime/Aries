import { ENDPOINTS } from '@/constants/endpoints'
import { stringArrayResponseSchema } from '@/shared/schemas/api'
import { apiGet } from './client'

export interface MaterialGradeOption {
  value: string
  label: string
}

let cachedGrades: MaterialGradeOption[] | null = null

export async function fetchMaterialGrades(): Promise<MaterialGradeOption[]> {
  if (cachedGrades) return cachedGrades
  try {
    const response = await apiGet(
      ENDPOINTS.MATERIAL_GRADES,
      stringArrayResponseSchema,
    )
    const list = response.data || []
    cachedGrades = list.map((v) => ({ value: v, label: v }))
    return cachedGrades
  } catch {
    return []
  }
}
