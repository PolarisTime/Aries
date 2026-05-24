export type ApiResponse<T> = { code: number; data: T; message?: string }

export type TableResponse<T> = {
  code?: number
  message?: string
  data?: {
    rows?: T[]
    total?: number
    hasMore?: boolean
  }
}
