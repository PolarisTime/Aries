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
  model: Record<string, unknown>
  details: Array<Record<string, unknown>>
}
