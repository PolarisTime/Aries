export interface UploadRulePayload {
  renamePattern: string
  status: string
  remark?: string
}

interface NumberRuleGenerateRecord {
  moduleKey: string
  generatedNo: string
  generatedId?: string | null
}

export interface UploadRuleRecord {
  id: string
  moduleKey: string
  moduleName: string
  ruleCode: string
  ruleName: string
  renamePattern: string
  status: string
  remark?: string
  previewFileName?: string
}

export interface AttachmentRecord {
  id: string
  name: string
  fileName: string
  originalFileName?: string
  contentType?: string
  fileSize?: number
  sourceType?: string
  uploader?: string
  uploadTime?: string
  previewSupported?: boolean
  previewType?: string
  previewUrl?: string
  downloadUrl?: string
  storageType?: string
  storageLabel?: string
}

export interface AttachmentBindingRecord {
  moduleKey: string
  recordId: string
  attachments: AttachmentRecord[]
}

export interface AttachmentBindingCountRecord {
  moduleKey: string
  counts: Record<string, number>
}

export interface AttachmentAccessUrlRecord {
  url?: string | null
  inline: boolean
  presigned: boolean
}

export interface AttachmentDirectUploadPrepareRecord {
  attachmentId: string | number
  token: string
  objectKey?: string
  storagePath?: string
  uploadUrl: string
  method?: string
  headers?: Record<string, string>
  expiresAt?: string | number
}

export interface AttachmentDirectUploadPreparePayload {
  fileName: string
  contentType: string
  fileSize: number
  sourceType: string
  sha256Hex: string
}

export interface LeoPageData<T> {
  content?: T[]
  records?: T[]
  currentPage?: number
  page?: number
  pageSize?: number
  size?: number
  totalElements: number
  totalPages: number
  first?: boolean
  last?: boolean
}

export type { NumberRuleGenerateRecord }
