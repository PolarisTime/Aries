export type ApiResponse<T> = { code: number; data: T; message?: string }
export type PagedResult<T> = { rows: T[]; total: number }

export type TableResponse<T> = {
  code?: number
  message?: string
  data?: {
    rows?: T[]
    total?: number
    hasMore?: boolean
  }
}
