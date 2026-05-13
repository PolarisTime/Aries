import { z } from 'zod'

export const moduleSearchSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(20),
  sortField: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  keyword: z.string().optional(),
})

export type ModuleSearch = z.infer<typeof moduleSearchSchema>
