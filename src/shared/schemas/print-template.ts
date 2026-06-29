import { z } from 'zod'

const printTemplateTypeSchema = z.enum(['COORD', 'PDF_FORM'])
const printTemplateEngineSchema = z.enum(['LODOP', 'PDF_FORM'])
const printTemplateStatusSchema = z.enum(['ACTIVE', 'DISABLED'])
const printTemplateSyncModeSchema = z.enum(['MANUAL', 'FILE'])
const responseIdSchema = z
  .union([z.string(), z.number().int().positive()])
  .transform((value) => String(value))

export const printTemplateRecordSchema = z.object({
  id: responseIdSchema,
  templateName: z.string(),
  templateCode: z.string().optional().nullable(),
  templateHtml: z.string(),
  templateType: printTemplateTypeSchema.optional(),
  engine: printTemplateEngineSchema.optional().nullable(),
  assetRef: z.string().optional().nullable(),
  versionNo: z.number().int().positive().optional().nullable(),
  status: printTemplateStatusSchema.optional().nullable(),
  syncMode: printTemplateSyncModeSchema.optional().nullable(),
  sourceRef: z.string().optional().nullable(),
  sourceChecksum: z.string().optional().nullable(),
  source: z.enum(['db', 'file']).optional(),
  fileName: z.string().optional(),
  billType: z.string().optional(),
  createTime: z.string().optional(),
  updateTime: z.string().optional(),
})
export type PrintTemplateRecord = z.infer<typeof printTemplateRecordSchema>

export const savePrintTemplatePayloadSchema = z
  .object({
    id: z.string().optional(),
    billType: z.string(),
    templateName: z.string().min(1),
    templateCode: z.string().optional(),
    templateHtml: z.string().optional(),
    templateType: printTemplateTypeSchema.optional(),
    engine: printTemplateEngineSchema.optional(),
    assetRef: z.string().optional(),
    versionNo: z.number().int().positive().optional(),
    status: printTemplateStatusSchema.optional(),
  })
  .superRefine((payload, ctx) => {
    const templateType = payload.templateType || 'COORD'
    if (templateType !== 'PDF_FORM' && !payload.templateHtml?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['templateHtml'],
        message: 'templateHtml is required',
      })
    }
  })
export type SavePrintTemplatePayload = z.infer<
  typeof savePrintTemplatePayloadSchema
>

export type PrintActionMode = 'preview' | 'print' | 'download'

export type PrintTemplateResponse<T> = {
  code?: number
  message?: string
  data: T
}
