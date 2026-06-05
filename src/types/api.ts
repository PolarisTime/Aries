export type RateLimitInfo = {
  limit: number
  remaining: number
  resetSeconds?: number
  retryAfterSeconds?: number
}

export type ApiResponse<T> = {
  code: number
  data: T
  message?: string
  rateLimit?: RateLimitInfo
  traceId?: string
}

export type TableResponse<T> = {
  code?: number
  message?: string
  data?: {
    rows?: T[]
    total?: number
    hasMore?: boolean
  }
}
