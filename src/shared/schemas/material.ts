export interface MaterialImportFailure {
  rowNumber: number
  materialCode: string | null
  reason: string
}

export type MaterialImportOutcome = 'CREATED' | 'UPDATED' | 'SKIPPED' | 'FAILED'

export interface MaterialImportRowResult {
  rowNumber: number
  materialCode: string | null
  brand: string | null
  material: string | null
  spec: string | null
  length: string | null
  outcome: MaterialImportOutcome
  reason: string | null
}

export interface MaterialImportResult {
  totalRows: number
  successCount: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  failures: MaterialImportFailure[]
  rows: MaterialImportRowResult[]
}
