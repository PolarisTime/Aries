import type {
  AttachmentBindingRecord,
  UploadRulePayload,
  UploadRuleRecord,
} from '@/api/business-types'
import { http } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type { RawApiRecord } from '@/types/api-raw'

export async function uploadAttachment(
  file: File,
  moduleKey: string,
  sourceType = 'PAGE_UPLOAD',
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('moduleKey', moduleKey)
  formData.append('sourceType', sourceType)

  return http.post<ApiResponse<RawApiRecord>>('/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export async function getAttachmentBindings(
  moduleKey: string,
  recordId: string | number,
) {
  return http.get<ApiResponse<AttachmentBindingRecord>>(
    '/attachments/bindings',
    {
      params: {
        moduleKey,
        recordId,
      },
    },
  )
}

export async function updateAttachmentBindings(
  moduleKey: string,
  recordId: string | number,
  attachmentIds: Array<string | number>,
) {
  const normalizedAttachmentIds = attachmentIds
    .map((item) => String(item).trim())
    .filter((item) => /^\d+$/.test(item) && item !== '0')

  return http.put<ApiResponse<AttachmentBindingRecord>>(
    '/attachments/bindings',
    {
      moduleKey,
      recordId: String(recordId).trim(),
      attachmentIds: normalizedAttachmentIds,
    },
  )
}

export async function getPageUploadRule(moduleKey: string) {
  return (
    (await http.get<ApiResponse<UploadRuleRecord> | undefined>(
      '/general-setting/upload-rule',
      {
        params: {
          moduleKey,
        },
      },
    )) ?? null
  )
}

export async function updatePageUploadRule(
  moduleKey: string,
  payload: UploadRulePayload,
) {
  return http.put<ApiResponse<UploadRuleRecord>>(
    '/general-setting/upload-rule',
    payload,
    {
      params: {
        moduleKey,
      },
    },
  )
}
