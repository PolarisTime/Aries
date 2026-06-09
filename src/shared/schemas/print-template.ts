import { z } from 'zod'

export const printTemplateTypeSchema = z.enum(['COORD', 'PDF_FORM'])
export const printTemplateEngineSchema = z.enum(['LODOP', 'PDF_FORM'])
export const printTemplateStatusSchema = z.enum(['ACTIVE', 'DISABLED'])
export const printTemplateSyncModeSchema = z.enum(['MANUAL', 'FILE'])

export const printTemplateRecordSchema = z.object({
  id: z.string(),
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

export const savePrintTemplatePayloadSchema = z.object({
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
}).superRefine((payload, ctx) => {
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
