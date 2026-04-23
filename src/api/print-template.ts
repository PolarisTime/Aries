import { restDelete, restGet, restPost } from '@/api/client'
import type {
  PrintTemplateRecord,
  PrintTemplateResponse,
  SavePrintTemplatePayload,
} from '@/types/print-template'

export function getDefaultPrintTemplate(billType: string) {
  return restGet<PrintTemplateResponse<PrintTemplateRecord | null>>('/printTemplate/getByBillType', {
    billType,
  })
}

export function listPrintTemplates(billType: string) {
  return restGet<PrintTemplateResponse<PrintTemplateRecord[]>>('/printTemplate/listByBillType', {
    billType,
  })
}

export function savePrintTemplate(payload: SavePrintTemplatePayload) {
  return restPost<PrintTemplateResponse<string>>('/printTemplate/save', payload as unknown as Record<string, unknown>)
}

export function deletePrintTemplate(id: number) {
  return restDelete<PrintTemplateResponse<string>>('/printTemplate/delete', { id })
}
