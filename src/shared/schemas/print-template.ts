import { z } from 'zod'

export const printTemplateRecordSchema = z.object({
  id: z.string(),
  templateName: z.string(),
  templateHtml: z.string(),
  templateType: z.string().optional(),
  isDefault: z.string(),
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
  templateHtml: z.string().min(1),
  isDefault: z.enum(['0', '1']).optional(),
})
export type SavePrintTemplatePayload = z.infer<
  typeof savePrintTemplatePayloadSchema
>
