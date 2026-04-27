import { restDelete, restGet, restPost, restPut } from '@/api/client'
import type {
  PrintTemplateRecord,
  PrintTemplateResponse,
  SavePrintTemplatePayload,
} from '@/types/print-template'

export function getDefaultPrintTemplate(billType: string) {
  return restGet<PrintTemplateResponse<PrintTemplateRecord | null>>('/print-templates/default', {
    billType,
  })
}

export function listPrintTemplates(billType: string) {
  return restGet<PrintTemplateResponse<PrintTemplateRecord[]>>('/print-templates', {
    billType,
  })
}

export function savePrintTemplate(payload: SavePrintTemplatePayload) {
  const requestBody = {
    billType: payload.billType,
    templateName: payload.templateName,
    templateHtml: payload.templateHtml,
    isDefault: payload.isDefault,
  }

  return payload.id
    ? restPut<PrintTemplateResponse<PrintTemplateRecord>>(
        `/print-templates/${encodeURIComponent(payload.id)}`,
        requestBody,
      )
    : restPost<PrintTemplateResponse<PrintTemplateRecord>>(
        '/print-templates',
        requestBody,
      )
}

export function deletePrintTemplate(id: string) {
  return restDelete<PrintTemplateResponse<string>>(`/print-templates/${encodeURIComponent(id)}`)
}
