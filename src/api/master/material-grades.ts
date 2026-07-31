import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'

export interface MaterialGradeOption {
  value: string
  label: string
}

export async function fetchMaterialGrades(): Promise<MaterialGradeOption[]> {
  const response = await apiGet(ENDPOINTS.MATERIAL_GRADES, z.array(z.string()))
  return response.map((value) => ({ value, label: value }))
}
