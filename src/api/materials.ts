import { http } from './client'
import type { ApiResponse } from '@/types/auth'
import type { MaterialImportResult } from '@/types/material'

export function importMaterialsCsv(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post<ApiResponse<MaterialImportResult>, ApiResponse<MaterialImportResult>>(
    '/materials/import',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
}
