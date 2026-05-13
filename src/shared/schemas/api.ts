import { z } from 'zod'

// ── API 响应 Schema ────────────────────────────────────

/** 统一 API 响应 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ code: z.number(), data, message: z.string().optional() })

/** 分页结果 */
export const pagedResultSchema = <T extends z.ZodTypeAny>(row: T) =>
  z.object({ rows: z.array(row), total: z.number() })

/** 业务单号生成 */
export const businessNoResultSchema = z.object({
  generatedNo: z.string(),
  generatedId: z.string().optional(),
})

// ── 基础字段 Schema（可复用片段） ──────────────────────

/** 物料信息字段块 */
export const materialInfoFields = {
  materialCode: z.string(),
  brand: z.string().optional(),
  category: z.string().optional(),
  material: z.string().optional(),
  spec: z.string().optional(),
  length: z.string().optional(),
  unit: z.string().optional(),
} as const

/** 重量/价格字段块 */
export const weightPriceFields = {
  quantity: z.union([z.string(), z.number()]).optional(),
  quantityUnit: z.string().optional(),
  pieceWeightTon: z.union([z.string(), z.number()]).optional(),
  piecesPerBundle: z.union([z.string(), z.number()]).optional(),
  weightTon: z.union([z.string(), z.number()]).optional(),
  unitPrice: z.union([z.string(), z.number()]).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
} as const

// ── 类型导出 ───────────────────────────────────────────

export type ApiResponse<T> = { code: number; data: T; message?: string }
export type PagedResult<T> = { rows: T[]; total: number }
export type BusinessNoResult = z.infer<typeof businessNoResultSchema>
