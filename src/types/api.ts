export type TableResponse<T> = {
  code?: number
  message?: string
  data?: {
    rows?: T[]
    total?: number
    hasMore?: boolean
  }
}
