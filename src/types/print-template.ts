export interface PrintTemplateRecord {
  id: number | string
  templateName: string
  templateHtml: string
  isDefault: string
  source?: 'db' | 'file'
  fileName?: string
  billType?: string
  createTime?: string
  updateTime?: string
}

export interface PrintTemplateResponse<T = unknown> {
  code: number
  data?: T
  message?: string
}

export interface SavePrintTemplatePayload {
  id?: number
  billType: string
  templateName: string
  templateHtml: string
  isDefault?: '0' | '1'
}
