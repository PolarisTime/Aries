import { z } from 'zod'

// ── API 响应 Schema（工厂函数，类型附在旁边便于泛型引用） ──

/** 统一 API 响应 */
export const businessNoResultSchema = z.object({})
export type BusinessNoResult = z.infer<typeof businessNoResultSchema>

// ── 可复用字段 Schema（Zod 对象，可 .extend() / .merge()） ──

/** 物料信息字段 */
export const materialInfoSchema = z.object({
  materialCode: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  material: z.string().optional(),
  spec: z.string().optional(),
  length: z.string().optional(),
  unit: z.string().optional(),
})

/** 重量/价格字段 */
export const weightPriceSchema = z.object({
  quantity: z.union([z.string(), z.number()]).optional(),
  quantityUnit: z.string().optional(),
  pieceWeightTon: z.union([z.string(), z.number()]).optional(),
  piecesPerBundle: z.union([z.string(), z.number()]).optional(),
  weightTon: z.union([z.string(), z.number()]).optional(),
  unitPrice: z.union([z.string(), z.number()]).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
})

// ── 枚举 / 常量 Schema ──────────────────────────────────

/** 单据状态枚举 */
export const documentStatusSchema = z.enum([
  '草稿',
  '已审核',
  '未审核',
  '已完成',
  '完成采购',
  '完成入库',
  '完成销售',
  '部分入库',
  '部分出库',
  '已签署',
  '未签署',
  '已送达',
  '未送达',
  '待确认',
  '已确认',
  '待审核',
  '已收款',
  '已付款',
  '已收票',
  '已开票',
  '未收票',
  '执行中',
  '已归档',
  '正常',
  '禁用',
  '部分结清',
])
export type DocumentStatus = z.infer<typeof documentStatusSchema>

/** 启用/禁用状态 */
export const enabledStatusSchema = z.enum(['正常', '禁用'])
export type EnabledStatus = z.infer<typeof enabledStatusSchema>
