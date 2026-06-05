export interface PrintDataRow {
  [key: string]: string
}

export interface RenderResult {
  type: 'COORD' | 'HTML'
  script?: string
  html?: string
}
