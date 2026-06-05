/**
 * API 原始响应数据类型
 * 用于后端返回的未规范化 JSON 数据
 */

/** 后端返回的原始记录数据（未规范化） */
export type RawApiRecord = {
  id?: string | number
  items?: RawApiRecord[]
  [key: string]: unknown
}

/** 后端返回的分页响应 */
export type RawPagePayload<T = RawApiRecord> = {
  content?: T[]
  records?: T[]
  totalElements: number
  totalPages?: number
  currentPage?: number
  pageSize?: number
}

/** 搜索参数类型 */
export type SearchParams = {
  keyword?: string
  page?: number
  pageSize?: number
  sortField?: string
  sortOrder?: string
  [key: string]: unknown
}
