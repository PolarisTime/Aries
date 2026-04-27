export interface MaterialImportResult {
  totalRows: number
  successCount: number
  createdCount: number
  updatedCount: number
  failedCount: number
  failures: MaterialImportFailure[]
}

export interface MaterialImportFailure {
  rowNumber: number
  materialCode: string
  reason: string
}
