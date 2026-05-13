import { z } from 'zod'

/**
 * 模块记录基础字段 Schema — 所有业务模块共有的字段。
 * 使用 .passthrough() 保留模块特有字段，同时为通用字段提供类型校验。
 */
export const moduleRecordBaseSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  remark: z.string().optional(),
  createdBy: z.union([z.string(), z.number()]).optional(),
  updatedBy: z.union([z.string(), z.number()]).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedFlag: z.boolean().optional(),
}).passthrough()

export type ModuleRecordBase = z.infer<typeof moduleRecordBaseSchema>

/** 行项目基础字段 Schema */
export const moduleLineItemBaseSchema = z.object({
  id: z.string().optional(),
  materialCode: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  material: z.string().optional(),
  spec: z.string().optional(),
  length: z.string().optional(),
  unit: z.string().optional(),
  warehouseName: z.string().optional(),
  batchNo: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).optional(),
  quantityUnit: z.string().optional(),
  pieceWeightTon: z.union([z.string(), z.number()]).optional(),
  piecesPerBundle: z.union([z.string(), z.number()]).optional(),
  weightTon: z.union([z.string(), z.number()]).optional(),
  unitPrice: z.union([z.string(), z.number()]).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
}).passthrough()

export type ModuleLineItemBase = z.infer<typeof moduleLineItemBaseSchema>

/**
 * 运行时安全校验：将 unknown 值校验为模块记录类型。
 * 失败时返回默认空记录，绝不抛异常。
 */
export function parseModuleRecord(value: unknown): ModuleRecordBase {
  const result = moduleRecordBaseSchema.safeParse(value)
  return result.success ? result.data : { id: '' }
}

export function parseModuleLineItem(value: unknown): ModuleLineItemBase {
  const result = moduleLineItemBaseSchema.safeParse(value)
  return result.success ? result.data : { id: '' }
}
