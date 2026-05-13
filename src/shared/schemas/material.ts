import { z } from 'zod'

export const materialImportFailureSchema = z.object({
  rowNumber: z.number(),
  materialCode: z.string(),
  reason: z.string(),
})
export type MaterialImportFailure = z.infer<typeof materialImportFailureSchema>

export const materialImportResultSchema = z.object({
  totalRows: z.number(),
  successCount: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  failedCount: z.number(),
  failures: z.array(materialImportFailureSchema),
})
export type MaterialImportResult = z.infer<typeof materialImportResultSchema>
