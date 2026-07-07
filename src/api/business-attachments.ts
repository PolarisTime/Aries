import type {
  AttachmentAccessUrlRecord,
  AttachmentBindingCountRecord,
  AttachmentBindingRecord,
  AttachmentDirectUploadPrepareRecord,
  UploadRulePayload,
  UploadRuleRecord,
} from '@/api/business-types'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type { RawApiRecord } from '@/types/api-raw'

const DIRECT_UPLOAD_UNSUPPORTED_MESSAGE = '不支持直传'
const FORBIDDEN_UPLOAD_HEADERS = new Set(['host', 'content-length'])
const INTERNAL_ATTACHMENT_URL_PATTERN =
  /^(?:\/api)?\/attachments\/([^/?#]+)\/(preview|download)(?:\?([^#]*))?(?:#.*)?$/

export interface AttachmentUploadOptions {
  onProgress?: (percent: number) => void
}

export async function uploadAttachment(
  file: File,
  moduleKey: string,
  sourceType = 'PAGE_UPLOAD',
  options: AttachmentUploadOptions = {},
) {
  try {
    const prepared = await prepareDirectUpload(file, moduleKey, sourceType)
    await putDirectUpload(file, prepared.data, options)
    reportUploadProgress(options, 100)
    return completeDirectUpload(
      prepared.data.attachmentId,
      prepared.data.token,
      moduleKey,
    )
  } catch (err) {
    if (!isDirectUploadUnsupported(err)) {
      throw err
    }
    const result = await uploadAttachmentMultipart(
      file,
      moduleKey,
      sourceType,
      options,
    )
    reportUploadProgress(options, 100)
    return result
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
  options: AttachmentUploadOptions,
) {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(prepared.method || 'PUT', prepared.uploadUrl)
    const headers = normalizeDirectUploadHeaders(prepared.headers)
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !event.total) {
        return
      }
      reportUploadProgress(
        options,
        Math.min(99, Math.round((event.loaded / event.total) * 100)),
      )
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(`S3 直传失败: ${xhr.status} ${xhr.statusText}`.trim()))
    }
    xhr.onerror = () => {
      reject(new Error('S3 直传失败'))
    }
    xhr.send(file)
  })
}

function uploadAttachmentMultipart(
  file: File,
  moduleKey: string,
  sourceType: string,
  options: AttachmentUploadOptions,
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('moduleKey', moduleKey)
  formData.append('sourceType', sourceType)

  return http.post<ApiResponse<RawApiRecord>>('/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (!event.total) {
        return
      }
      reportUploadProgress(
        options,
        Math.min(99, Math.round((event.loaded / event.total) * 100)),
      )
    },
  })
}

function reportUploadProgress(
  options: AttachmentUploadOptions,
  percent: number,
) {
  options.onProgress?.(Math.max(0, Math.min(100, Math.round(percent))))
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

export async function fetchAttachmentCounts(
  moduleKey: string,
  recordIds: Array<string | number>,
): Promise<ApiResponse<AttachmentBindingCountRecord>> {
  const normalizedRecordIds = normalizeRecordIds(recordIds)
  if (!normalizedRecordIds.length) {
    return {
      code: 0,
      data: {
        moduleKey,
        counts: {},
      },
    }
  }

  return http.get<ApiResponse<AttachmentBindingCountRecord>>(
    '/attachments/bindings/counts',
    {
      params: {
        moduleKey,
        recordIds: normalizedRecordIds.join(','),
      },
    },
  )
}

export async function resolveAttachmentAccessUrl(
  url: string,
  moduleKey: string,
  inline: boolean,
): Promise<AttachmentAccessUrlRecord> {
  const parsed = parseInternalAttachmentUrl(url)
  if (!parsed) {
    return {
      inline,
      presigned: true,
      url,
    }
  }

  const resolvedModuleKey = moduleKey.trim() || parsed.moduleKey
  const response = await http.get<ApiResponse<AttachmentAccessUrlRecord>>(
    `/attachments/${parsed.id}/access-url`,
    {
      params: {
        accessKey: parsed.accessKey,
        inline,
        moduleKey: resolvedModuleKey,
      },
    },
  )
  return response.data
}

export async function getAttachmentBlob(url: string): Promise<Blob> {
  const parsed = parseInternalAttachmentUrl(url)
  if (!parsed) {
    return fetchExternalAttachmentBlob(url)
  }

  return http.get<Blob>(`/attachments/${parsed.id}/${parsed.action}`, {
    params: {
      accessKey: parsed.accessKey,
      moduleKey: parsed.moduleKey,
    },
    responseType: 'blob',
  })
}

export async function getPresignedAttachmentBlob(
  url: string,
  moduleKey: string,
  inline: boolean,
): Promise<Blob> {
  const access = await resolveAttachmentAccessUrl(url, moduleKey, inline)
  if (access.url) {
    return fetchExternalAttachmentBlob(access.url)
  }
  return getAttachmentBlob(url)
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

function parseInternalAttachmentUrl(url: string) {
  const trimmed = url.trim()
  const match = INTERNAL_ATTACHMENT_URL_PATTERN.exec(trimmed)
  if (!match) {
    return null
  }

  const params = new URLSearchParams(match[3] || '')
  return {
    action: match[2],
    accessKey: params.get('accessKey') || '',
    id: decodeURIComponent(match[1]),
    moduleKey: params.get('moduleKey') || '',
  }
}

async function fetchExternalAttachmentBlob(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `附件读取失败: ${response.status} ${response.statusText}`.trim(),
    )
  }
  return response.blob()
}

function normalizeRecordIds(recordIds: Array<string | number>) {
  return [
    ...new Set(
      recordIds.flatMap((item) => {
        const v = String(item).trim()
        return /^\d+$/.test(v) && v !== '0' ? [v] : []
      }),
    ),
  ]
}

export async function updatePageUploadRule(
  moduleKey: string,
  payload: UploadRulePayload,
) {
  return http.put<ApiResponse<UploadRuleRecord>>(
    ENDPOINTS.UPLOAD_RULE,
    payload,
    {
      params: {
        moduleKey,
      },
    },
  )
}
