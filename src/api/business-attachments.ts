import type {
  AttachmentBindingRecord,
  AttachmentDirectUploadPrepareRecord,
  UploadRulePayload,
  UploadRuleRecord,
} from '@/api/business-types'
import { http } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type { RawApiRecord } from '@/types/api-raw'

const DIRECT_UPLOAD_UNSUPPORTED_MESSAGE = '不支持直传'
const FORBIDDEN_UPLOAD_HEADERS = new Set(['host', 'content-length'])

export async function uploadAttachment(
  file: File,
  moduleKey: string,
  sourceType = 'PAGE_UPLOAD',
) {
  try {
    const prepared = await prepareDirectUpload(file, moduleKey, sourceType)
    await putDirectUpload(file, prepared.data)
    return completeDirectUpload(
      prepared.data.attachmentId,
      prepared.data.token,
      moduleKey,
    )
  } catch (err) {
    if (!isDirectUploadUnsupported(err)) {
      throw err
    }
    return uploadAttachmentMultipart(file, moduleKey, sourceType)
  }
}

export async function prepareDirectUpload(
  file: File,
  moduleKey: string,
  sourceType = 'PAGE_UPLOAD',
) {
  const sha256Hex = await calculateFileSha256Hex(file)

  return http.post<ApiResponse<AttachmentDirectUploadPrepareRecord>>(
    '/attachments/direct-upload/prepare',
    {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
      sourceType,
      sha256Hex,
    },
    { params: { moduleKey } },
  )
}

export async function completeDirectUpload(
  attachmentId: string | number,
  token: string,
  moduleKey: string,
) {
  return http.post<ApiResponse<RawApiRecord>>(
    '/attachments/direct-upload/complete',
    {
      attachmentId,
      token,
    },
    { params: { moduleKey } },
  )
}

async function putDirectUpload(
  file: File,
  prepared: AttachmentDirectUploadPrepareRecord,
) {
  const response = await fetch(prepared.uploadUrl, {
    method: prepared.method || 'PUT',
    headers: normalizeDirectUploadHeaders(prepared.headers),
    body: file,
  })

  if (!response.ok) {
    throw new Error(
      `S3 直传失败: ${response.status} ${response.statusText}`.trim(),
    )
  }
}

function uploadAttachmentMultipart(
  file: File,
  moduleKey: string,
  sourceType: string,
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('moduleKey', moduleKey)
  formData.append('sourceType', sourceType)

  return http.post<ApiResponse<RawApiRecord>>('/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

function normalizeDirectUploadHeaders(headers?: Record<string, string>) {
  if (!headers) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(headers).filter(
      ([key]) => !FORBIDDEN_UPLOAD_HEADERS.has(key.toLowerCase()),
    ),
  )
}

async function calculateFileSha256Hex(file: File) {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function isDirectUploadUnsupported(err: unknown) {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : ''
  if (message.includes(DIRECT_UPLOAD_UNSUPPORTED_MESSAGE)) {
    return true
  }

  const response = (err as { response?: { data?: { message?: unknown } } })
    ?.response
  const responseMessage =
    typeof response?.data?.message === 'string' ? response.data.message : ''
  return responseMessage.includes(DIRECT_UPLOAD_UNSUPPORTED_MESSAGE)
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
  const normalizedAttachmentIds = attachmentIds.flatMap((item) => {
    const v = String(item).trim()
    return /^\d+$/.test(v) && v !== '0' ? [v] : []
  })

  return http.put<ApiResponse<AttachmentBindingRecord>>(
    '/attachments/bindings',
    {
      moduleKey,
      recordId: String(recordId).trim(),
      attachmentIds: normalizedAttachmentIds,
    },
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
