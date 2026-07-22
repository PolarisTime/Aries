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
} from '@/shared/schemas'

export interface PrintRecordItem {
  id: string
  recordId: string
  brand: string
  category: string
  settlementMode?: string
  material: string
  spec: string
  length: string
  quantity: string
  pieceWeightTon: string
  weightTon: string
  unitPrice: string
  amount: string
}

export interface SalesOrderPrintXlsxOptions {
  hideUnitPrice?: boolean
  hideRemark?: boolean
  brandOverridesByItemId?: Record<string, string>
  itemOrder?: string[]
  selectedItemIds?: string[]
}

export interface ExportSalesOrderPrintXlsxPayload {
  printOptions?: SalesOrderPrintXlsxOptions
}

export interface SalesOrderPrintXlsxDownload {
  blob: Blob
  fileName?: string
}

function contentDispositionFileName(value: unknown) {
  const header = value == null ? '' : String(value)
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded.replace(/^"|"$/g, ''))
    } catch {
      // Continue with the plain filename parameter.
    }
  }
  return /filename\s*=\s*"([^"]+)"/i.exec(header)?.[1]
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

export async function exportSalesOrderPrintXlsx(
  recordId: string,
  payload: ExportSalesOrderPrintXlsxPayload = {},
): Promise<SalesOrderPrintXlsxDownload> {
  const response = await http.postResponse<Blob>(
    `/sales-orders/${encodeURIComponent(recordId)}/print-xlsx`,
    payload,
    {
      responseType: 'blob',
    },
  )
  return {
    blob: response.data,
    fileName: contentDispositionFileName(
      response.headers['content-disposition'],
    ),
  }
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
    settlementCompanyId: payload.settlementCompanyId,
    settlementCompanyName: payload.settlementCompanyName,
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
