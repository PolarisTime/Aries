import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

export interface MaterialGradeOption {
  value: string
  label: string
}

let cachedGrades: MaterialGradeOption[] | null = null

export async function fetchMaterialGrades(): Promise<MaterialGradeOption[]> {
  if (cachedGrades) return cachedGrades
  try {
    const response = await http.get<ApiResponse<string[]>>(ENDPOINTS.MATERIAL_GRADES)
    const list = response.data || []
    cachedGrades = list.map((v) => ({ value: v, label: v }))
    return cachedGrades
  } catch {
    return []
  }
}

export function getCachedMaterialGrades(): MaterialGradeOption[] {
  return cachedGrades || []
}
