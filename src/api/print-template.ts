import {
  assertApiSuccess,
  http,
  restDelete,
  restGet,
  restPost,
  restPut,
} from '@/api/client'
import type {
  PrintTemplateRecord,
  PrintTemplateResponse,
  SavePrintTemplatePayload,
} from '@/types/print-template'

export interface PrintRecordItem {
  id: string
  recordId: string
  brand: string
  category: string
  material: string
  spec: string
  quantity: string
  pieceWeightTon: string
  weightTon: string
  unitPrice: string
  amount: string
}

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

export function listPrintRecordBrands(moduleKey: string, recordIds: string[]) {
  return restPost<PrintTemplateResponse<string[]>>('/print/brands', {
    moduleKey,
    recordIds,
  })
}

export function listPrintRecordItems(moduleKey: string, recordIds: string[]) {
  return restPost<PrintTemplateResponse<PrintRecordItem[]>>('/print/items', {
    moduleKey,
    recordIds,
  })
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

export async function uploadPrintTemplateJson(id: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await http.post<PrintTemplateResponse<PrintTemplateRecord>>(
    `/print-templates/${encodeURIComponent(id)}/upload-json`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
  return assertApiSuccess(response, '上传模板 JSON 失败')
}
