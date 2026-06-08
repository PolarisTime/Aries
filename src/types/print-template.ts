/** @deprecated 类型已迁移至 src/shared/schemas/print-template.ts，请从 '@/shared/schemas' 导入 */
export type {
  PrintActionMode,
  PrintTemplateRecord,
  SavePrintTemplatePayload,
} from '@/shared/schemas'

export type PrintTemplateResponse<T> = {
  code?: number
  message?: string
  data: T
}
