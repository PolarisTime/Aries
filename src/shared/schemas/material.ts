export interface MaterialImportFailure {
  rowNumber: number
  materialCode: string
  reason: string
}

export interface MaterialImportResult {
  totalRows: number
  successCount: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  failures: MaterialImportFailure[]
}
