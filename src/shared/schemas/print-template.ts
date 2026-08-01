import { z } from 'zod'
import { responseDateTimeSchema, responseEntityIdSchema } from './api'

const printTemplateTypeSchema = z.enum(['COORD', 'PDF_FORM'])
const printTemplateEngineSchema = z.enum(['LODOP', 'PDF_FORM'])
const printTemplateStatusSchema = z.enum(['ACTIVE', 'DISABLED'])
export const printTemplateRecordSchema = z.object({
  id: responseEntityIdSchema,
  templateName: z.string(),
  templateCode: z.string().nullish(),
  templateHtml: z.string(),
  templateType: printTemplateTypeSchema.optional(),
  engine: printTemplateEngineSchema.nullish(),
  assetRef: z.string().nullish(),
  settlementCompanyId: responseEntityIdSchema.nullish(),
  settlementCompanyName: z.string().nullish(),
  versionNo: z.number().int().positive().nullish(),
  status: printTemplateStatusSchema.nullish(),
  syncMode: z.enum(['MANUAL', 'FILE']).nullish(),
  sourceRef: z.string().nullish(),
  sourceChecksum: z.string().nullish(),
  source: z.enum(['db', 'file']).optional(),
  fileName: z.string().optional(),
  billType: z.string().optional(),
  createTime: responseDateTimeSchema.optional(),
  updateTime: responseDateTimeSchema.optional(),
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
