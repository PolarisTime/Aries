import { z } from 'zod'
import { parseApiContract } from '@/api/core/api-contract'
import {
  apiDeleteNoContent,
  apiGet,
  apiPost,
  apiPut,
  downloadPostResponse,
} from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { SavePrintTemplatePayload } from '@/shared/schemas'
import {
  printTemplateRecordSchema,
  savePrintTemplatePayloadSchema,
} from '@/shared/schemas/print-template'

const printRecordItemSchema = z.object({
  id: z.string(),
  recordId: z.string(),
  brand: z.string(),
  category: z.string(),
  settlementMode: z.string().optional(),
  material: z.string(),
  spec: z.string(),
  length: z.string(),
  quantity: z.string(),
  pieceWeightTon: z.string(),
  weightTon: z.string(),
  unitPrice: z.string(),
  amount: z.string(),
})

const printTemplateListResponseSchema = z.array(printTemplateRecordSchema)
const printRecordItemsResponseSchema = z.array(printRecordItemSchema)
const printOutputBaseSchema = z.object({
  templateName: z.string().optional(),
  templateType: z.string().optional(),
  data: z.record(z.string(), z.string()).optional(),
  items: z.array(z.record(z.string(), z.string())).optional(),
})
const printOutputSchema = z.discriminatedUnion('kind', [
  printOutputBaseSchema.extend({
    kind: z.literal('PDF'),
    contentType: z.string().optional(),
    fileName: z.string().optional(),
    pdfBase64: z.string(),
  }),
  printOutputBaseSchema.extend({
    kind: z.literal('LODOP_SCRIPT'),
    templateHtml: z.string(),
  }),
])
const printRecordResponseSchema = printOutputSchema
const printTemplateItemResponseSchema = printTemplateRecordSchema
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
  return apiGet(ENDPOINTS.PRINT_TEMPLATES, printTemplateListResponseSchema, {
    params: { billType },
  })
}

export function listPrintRecordItems(moduleKey: string, recordIds: string[]) {
  return apiPost(ENDPOINTS.PRINT_ITEMS, printRecordItemsResponseSchema, {
    moduleKey,
    recordIds,
  })
}

export function renderPrintRecord(
  templateId: string,
  moduleKey: string,
  recordId: string,
  printOptions?: unknown,
) {
  return apiPost(ENDPOINTS.PRINT_RECORD, printRecordResponseSchema, {
    templateId,
    moduleKey,
    recordId,
    ...(printOptions ? { printOptions } : {}),
  })
}

export async function exportSalesOrderPrintXlsx(
  recordId: string,
  payload: ExportSalesOrderPrintXlsxPayload = {},
): Promise<SalesOrderPrintXlsxDownload> {
  const response = await downloadPostResponse(
    ENDPOINTS.SALES_ORDER_PRINT_XLSX(recordId),
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
  const validatedPayload = parseApiContract(
    savePrintTemplatePayloadSchema,
    payload,
    '保存打印模板请求',
  )
  const templateType = validatedPayload.templateType || 'COORD'
  const requestBody = {
    billType: validatedPayload.billType,
    templateName: validatedPayload.templateName,
    templateCode: validatedPayload.templateCode,
    templateHtml: validatedPayload.templateHtml || '',
    templateType,
    engine:
      validatedPayload.engine || defaultEngineForTemplateType(templateType),
    assetRef:
      templateType === 'PDF_FORM' ? validatedPayload.assetRef : undefined,
    settlementCompanyId: validatedPayload.settlementCompanyId,
    settlementCompanyName: validatedPayload.settlementCompanyName,
    versionNo: validatedPayload.versionNo || 1,
    status: validatedPayload.status || 'ACTIVE',
  }

  return validatedPayload.id
    ? apiPut(
        ENDPOINTS.PRINT_TEMPLATE(validatedPayload.id),
        printTemplateItemResponseSchema,
        requestBody,
      )
    : apiPost(
        ENDPOINTS.PRINT_TEMPLATES,
        printTemplateItemResponseSchema,
        requestBody,
      )
}

export function deletePrintTemplate(id: string) {
  return apiDeleteNoContent(ENDPOINTS.PRINT_TEMPLATE(id))
}

export async function uploadPrintTemplateJson(id: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return apiPost(
    ENDPOINTS.PRINT_TEMPLATE_UPLOAD_JSON(id),
    printTemplateItemResponseSchema,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
}
