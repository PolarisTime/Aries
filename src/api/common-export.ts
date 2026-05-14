import { z } from 'zod'
import { http, isSuccessCode } from '@/api/client'
import type { ApiResponse } from '@/shared/schemas'
import type { SearchParams } from '@/types/api-raw'
import { getApiMessage } from '@/utils/api-messages'
import { downloadBlob } from '@/utils/download'

const importErrorSchema = z.object({
  row: z.number(),
  field: z.string(),
  message: z.string(),
})

const importResultSchema = z.object({
  totalRows: z.number(),
  successCount: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  failCount: z.number(),
  errors: z.array(importErrorSchema),
})

export type ImportError = z.infer<typeof importErrorSchema>
export type ImportResult = z.infer<typeof importResultSchema>

export async function exportModuleData(
  module: string,
  params: SearchParams,
): Promise<void> {
  const response = await http.instance.post(`/${module}/export`, params, {
    responseType: 'blob',
  })
  downloadBlob(response.data as Blob, `${module}.xlsx`)
}

export async function downloadImportTemplate(module: string): Promise<void> {
  const response = await http.instance.get(`/${module}/template`, {
    responseType: 'blob',
  })
  downloadBlob(response.data as Blob, `${module}_import_template.xlsx`)
}

export async function importModuleData(
  module: string,
  file: File,
): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await http.post<ApiResponse<ImportResult>>(
    `/${module}/import`,
    formData,
  )
  if (!isSuccessCode(response.code)) {
    throw new Error(response.message || getApiMessage('importFailed'))
  }
  const parsed = importResultSchema.safeParse(response.data)
  if (!parsed.success) {
    throw new Error(getApiMessage('importResponseValidationFailed'))
  }
  return parsed.data
}
