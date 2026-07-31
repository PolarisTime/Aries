/**
 * API 原始响应数据类型
 * 用于后端返回的未规范化 JSON 数据
 */

/** 后端返回的原始记录数据（未规范化） */
export type RawApiRecord = {
  id?: unknown
  items?: RawApiRecord[]
  [key: string]: unknown
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
