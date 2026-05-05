import { z } from 'zod'

export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    code: z.number(),
    message: z.string(),
    data: dataSchema,
    timestamp: z.string().datetime().optional(),
  })

export const pagedResultSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    rows: z.array(itemSchema),
    total: z.number().int().nonnegative(),
  })

export const tableResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  apiResponseSchema(pagedResultSchema(itemSchema))

export type ApiResponse<T> = z.infer<ReturnType<typeof apiResponseSchema<z.ZodType<T>>>>
export type PagedResult<T> = z.infer<ReturnType<typeof pagedResultSchema<z.ZodType<T>>>>
