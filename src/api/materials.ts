import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'
import { http } from './client'

type MaterialSearchResponse = ModuleRecord & {
  materialCode?: string
  brand?: string
  category?: string
  material?: string
  spec?: string
  length?: string
  unit?: string
  quantityUnit?: string
  pieceWeightTon?: number
  piecesPerBundle?: number
  unitPrice?: number
  batchNoEnabled?: boolean
  remark?: string
}



export async function fetchMaterialSearch(keyword = '', limit = 200) {
  const response = await http.get<ApiResponse<MaterialSearchResponse[]>>(
    ENDPOINTS.MATERIALS_SEARCH,
    {
      params: {
        keyword,
        limit,
      },
    },
  )

  if (Number(response.code) !== 0 || !Array.isArray(response.data)) {
    return [] as MaterialSearchResponse[]
  }

  return response.data
}
