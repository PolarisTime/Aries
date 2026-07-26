import { apiGet, assertApiSuccess } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { stringArrayResponseSchema } from '@/shared/schemas/api'

export interface MaterialGradeOption {
  value: string
  label: string
}

export async function fetchMaterialGrades(): Promise<MaterialGradeOption[]> {
  const response = assertApiSuccess(
    await apiGet(ENDPOINTS.MATERIAL_GRADES, stringArrayResponseSchema),
    '加载物料牌号失败',
  )
  return response.data.map((value) => ({ value, label: value }))
}
