import type { ModuleRecord } from '@/types/module-page'

export interface PrintTemplateTokenDescriptor {
  key: string
  label: string
  token: string
  description?: string
}

export interface PrintTemplateTokenGroup {
  key: string
  label: string
  description?: string
  tokens: PrintTemplateTokenDescriptor[]
}

export interface PrintTemplateSnippet {
  key: string
  label: string
  description: string
  content: string
}

export interface PrintTemplatePreviewData {
  model: ModuleRecord
  details: Array<ModuleRecord>
}
