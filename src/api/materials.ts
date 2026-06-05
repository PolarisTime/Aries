import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'
import { downloadBlob } from '@/utils/download'
import { assertApiSuccess, http } from './client'

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

export interface MaterialImportError {
  row: number
  field: string
  message: string
}

export interface MaterialImportResult {
  totalRows: number
  successCount: number
  createdCount: number
  updatedCount: number
  failCount: number
  errors: MaterialImportError[]
  successRows?: unknown[]
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

export async function downloadMaterialImportTemplate() {
  const blob = await http.get<Blob>(ENDPOINTS.MATERIALS_TEMPLATE, {
    responseType: 'blob',
  })
  downloadBlob(blob, '商品资料导入模板.xlsx')
}

export async function importMaterialFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await http.post<ApiResponse<MaterialImportResult>>(
    ENDPOINTS.MATERIALS_IMPORT,
    formData,
  )

  assertApiSuccess(response)
  return response.data
}
