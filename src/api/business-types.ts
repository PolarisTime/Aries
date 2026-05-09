export interface UploadRulePayload {
  renamePattern: string
  status: string
  remark?: string
}

interface NumberRuleGenerateRecord {
  moduleKey: string
  generatedNo: string
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
}

export interface AttachmentBindingRecord {
  moduleKey: string
  recordId: string
  attachments: AttachmentRecord[]
}

export interface LeoPageData<T> {
  records: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export type { NumberRuleGenerateRecord }
