import { http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { MaterialImportResult } from '@/types/material'

export function importMaterialsCsv(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post<ApiResponse<MaterialImportResult>>(ENDPOINTS.MATERIALS_IMPORT, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function downloadMaterialsTemplate() {
  return http.get(ENDPOINTS.MATERIALS_TEMPLATE, { responseType: 'blob' })
}
