/** @deprecated 类型已迁移至 src/shared/schemas/api.ts，请从 '@/shared/schemas' 导入 */
export type { ApiResponse, PagedResult } from '@/shared/schemas'

export type TableResponse<T> = {
  code?: number
  message?: string
  data?: {
    rows?: T[]
    total?: number
    hasMore?: boolean
  }
}
