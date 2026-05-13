import { z } from 'zod'

/** 统一 API 响应包装 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    code: z.number(),
    data: dataSchema,
    message: z.string().optional(),
  })

/** 分页结果 */
export const pagedResultSchema = <T extends z.ZodTypeAny>(rowSchema: T) =>
  z.object({
    rows: z.array(rowSchema),
    total: z.number(),
    errorCode: z.number().optional(),
    errorMessage: z.string().optional(),
  })

export type ApiResponse<T> = {
  code: number
  data: T
  message?: string
}

export type PagedResult<T> = {
  rows: T[]
  total: number
  errorCode?: number
  errorMessage?: string
}
