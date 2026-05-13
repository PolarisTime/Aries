import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'
import type { MaterialImportResult } from '@/types/material'
import { http } from './client'

interface MaterialSearchResponse extends ModuleRecord {
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

export function importMaterialsCsv(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post<ApiResponse<MaterialImportResult>>(
    ENDPOINTS.MATERIALS_IMPORT,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
}

export function downloadMaterialsTemplate() {
  return http.get(ENDPOINTS.MATERIALS_TEMPLATE, { responseType: 'blob' })
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
