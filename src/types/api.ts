export interface TableResponse<T> {
  code: number
  data?: {
    rows?: T[]
    total?: number
  }
  message?: string
}

export interface PagedResult<T> {
  rows: T[]
  total: number
  errorCode?: number
  errorMessage?: string
}
