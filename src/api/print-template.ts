import { restDelete, restGet, restPost, restPut } from '@/api/client'
import type {
  PrintTemplateRecord,
  PrintTemplateResponse,
  SavePrintTemplatePayload,
} from '@/types/print-template'

function defaultEngineForTemplateType(
  templateType: SavePrintTemplatePayload['templateType'],
) {
  if (templateType === 'COORD') return 'LODOP'
  if (templateType === 'PDF_FORM') return 'PDF_FORM'
  return 'LODOP'
}

export function listPrintTemplates(billType: string) {
  return restGet<PrintTemplateResponse<PrintTemplateRecord[]>>(
    '/print-templates',
    {
      billType,
    },
  )
}

export function savePrintTemplate(payload: SavePrintTemplatePayload) {
  const templateType = payload.templateType || 'COORD'
  const requestBody = {
    billType: payload.billType,
    templateName: payload.templateName,
    templateCode: payload.templateCode,
    templateHtml: payload.templateHtml || '',
    templateType,
    engine: payload.engine || defaultEngineForTemplateType(templateType),
    assetRef: templateType === 'PDF_FORM' ? payload.assetRef : undefined,
    versionNo: payload.versionNo || 1,
    status: payload.status || 'ACTIVE',
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
  return restDelete<PrintTemplateResponse<string>>(
    `/print-templates/${encodeURIComponent(id)}`,
  )
}
