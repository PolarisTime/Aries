import { z } from 'zod'

const printTemplateTypeSchema = z.enum(['COORD', 'PDF_FORM'])
const printTemplateEngineSchema = z.enum(['LODOP', 'PDF_FORM'])
const printTemplateStatusSchema = z.enum(['ACTIVE', 'DISABLED'])
const responseIdSchema = z
  .union([z.string(), z.number().int().positive()])
  .transform(String)

export const printTemplateRecordSchema = z.object({
  id: responseIdSchema,
  templateName: z.string(),
  templateCode: z.string().nullish(),
  templateHtml: z.string(),
  templateType: printTemplateTypeSchema.optional(),
  engine: printTemplateEngineSchema.nullish(),
  assetRef: z.string().nullish(),
  settlementCompanyId: responseIdSchema.nullish(),
  settlementCompanyName: z.string().nullish(),
  versionNo: z.number().int().positive().nullish(),
  status: printTemplateStatusSchema.nullish(),
  syncMode: z.enum(['MANUAL', 'FILE']).nullish(),
  sourceRef: z.string().nullish(),
  sourceChecksum: z.string().nullish(),
  source: z.enum(['db', 'file']).optional(),
  fileName: z.string().optional(),
  billType: z.string().optional(),
  createTime: z.string().optional(),
  updateTime: z.string().optional(),
})
export type PrintTemplateRecord = z.output<typeof printTemplateRecordSchema>

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
    settlementCompanyId: z.string().optional(),
    settlementCompanyName: z.string().optional(),
    versionNo: z.number().int().positive().optional(),
    status: printTemplateStatusSchema.optional(),
  })
  .superRefine((payload, context) => {
    if (
      (payload.templateType ?? 'COORD') !== 'PDF_FORM' &&
      !payload.templateHtml?.trim()
    ) {
      context.addIssue({
        code: 'custom',
        path: ['templateHtml'],
        message: 'templateHtml is required',
      })
    }
  })
export type SavePrintTemplatePayload = z.input<
  typeof savePrintTemplatePayloadSchema
>

export type PrintActionMode = 'preview' | 'print' | 'download'

export type PrintTemplateResponse<T> = {
  code?: number
  message?: string
  data: T
}

export const printTemplateResponseSchema = <Schema extends z.ZodType>(
  dataSchema: Schema,
) =>
  z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    data: dataSchema,
  })
