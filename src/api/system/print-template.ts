import { z } from 'zod'
import { parseApiContract } from '@/api/core/api-contract'
import {
  apiDeleteNoContent,
  apiGet,
  apiGetOptional,
  apiPost,
  apiPut,
  downloadPostResponse,
} from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import type { SavePrintTemplatePayload } from '@/shared/schemas'
import { exactPageSchema, responseEntityIdSchema } from '@/shared/schemas/api'
import {
  printTemplateRecordSchema,
  savePrintTemplatePayloadSchema,
} from '@/shared/schemas/print-template'
import type { EntityId } from '@/types/entity-id'

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
  sourceNo: z.string().optional(),
  deliveryDate: z.string().optional(),
  quantityUnit: z.string().optional(),
  customerName: z.string().optional(),
  projectName: z.string().optional(),
  sourceSalesOrderItemId: z.string().optional(),
  sourceFreightBillId: z.string().optional(),
  sourceFreightBillUnitPrice: z.string().optional(),
  sourceFreightBillTotalFreight: z.string().optional(),
})

const printTemplateListResponseSchema = z.array(printTemplateRecordSchema)
const printRecordItemPageResponseSchema = exactPageSchema(printRecordItemSchema)
const printOutputBaseSchema = z.object({
  templateName: z.string().optional(),
  templateType: z.string().optional(),
  data: z.record(z.string(), z.string()).nullable().optional(),
  items: z.array(z.record(z.string(), z.string())).nullable().optional(),
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
  sourceNo?: string
  deliveryDate?: string
  quantityUnit?: string
  customerName?: string
  projectName?: string
  sourceSalesOrderItemId?: string
  sourceFreightBillId?: string
  sourceFreightBillUnitPrice?: string
  sourceFreightBillTotalFreight?: string
}

export interface SalesOrderPrintXlsxOptions {
  hideUnitPrice?: boolean
  hideRemark?: boolean
  brandOverridesByItemId?: Record<string, string>
  itemOrder?: string[]
  selectedItemIds?: string[]
  splitPieceCount?: number
  /** 逐行勾选拆分的明细 ID；空数组表示没有任何行需要拆分。 */
  splitItemIds?: string[]
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

export function listPrintTemplates(billType: string, signal?: AbortSignal) {
  return apiGet(ENDPOINTS.PRINT_TEMPLATES, printTemplateListResponseSchema, {
    params: { billType },
    signal,
  })
}

const PRINT_ITEMS_PAGE_SIZE = 200

export async function listPrintRecordItems(
  moduleKey: string,
  recordIds: string[],
  signal?: AbortSignal,
): Promise<PrintRecordItem[]> {
  const fetchPage = (page: number) =>
    apiGet(ENDPOINTS.PRINT_PREVIEWS_ITEMS, printRecordItemPageResponseSchema, {
      params: {
        moduleKey,
        recordIds: recordIds.join(','),
        page,
        size: PRINT_ITEMS_PAGE_SIZE,
      },
      signal,
    })

  // 打印明细必须完整：按后端总页数拉全，避免只取首页导致批量打印静默少打。
  const firstPage = await fetchPage(0)
  const restPages = await Promise.all(
    Array.from({ length: Math.max(firstPage.totalPages - 1, 0) }, (_, index) =>
      fetchPage(index + 1),
    ),
  )
  return [firstPage, ...restPages].flatMap((page) => page.content)
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

export async function renderPrintRecord(
  templateId: string,
  moduleKey: string,
  recordId: string,
  printOptions?: unknown,
) {
  const response = await downloadPostResponse(
    ENDPOINTS.PRINT_EXPORTS,
    {
      templateId,
      moduleKey,
      recordId,
      ...(printOptions ? { printOptions } : {}),
    },
    withIdempotencyKey({ responseType: 'blob' }),
  )
  const contentType = String(response.headers['content-type'] || '')

  if (contentType.includes('json')) {
    const text = await response.data.text()
    return parseApiContract(
      printRecordResponseSchema,
      JSON.parse(text),
      'POST /print-exports',
    )
  }

  return {
    kind: 'PDF' as const,
    contentType: contentType || 'application/pdf',
    fileName: contentDispositionFileName(
      response.headers['content-disposition'],
    ),
    pdfBase64: await blobToBase64(response.data),
  }
}

export async function exportSalesOrderPrintXlsx(
  recordId: string,
  payload: ExportSalesOrderPrintXlsxPayload = {},
): Promise<SalesOrderPrintXlsxDownload> {
  const response = await downloadPostResponse(
    ENDPOINTS.SALES_ORDER_PRINT_XLSX(recordId),
    payload,
    withIdempotencyKey({
      responseType: 'blob',
    }),
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
        withIdempotencyKey(),
      )
    : apiPost(
        ENDPOINTS.PRINT_TEMPLATES,
        printTemplateItemResponseSchema,
        requestBody,
        withIdempotencyKey(),
      )
}

export function deletePrintTemplate(id: string) {
  return apiDeleteNoContent(ENDPOINTS.PRINT_TEMPLATE(id), withIdempotencyKey())
}

export async function uploadPrintTemplateJson(id: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return apiPut(
    ENDPOINTS.PRINT_TEMPLATE_CONTENT(id),
    printTemplateItemResponseSchema,
    formData,
    withIdempotencyKey({
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  )
}

const projectPrintPreferenceSchema = z.object({
  projectId: responseEntityIdSchema,
  billType: z.string(),
  templateId: responseEntityIdSchema,
  templateName: z.string(),
})

export type ProjectPrintPreference = z.output<
  typeof projectPrintPreferenceSchema
>

/** 查询项目在某单据类型下上次所选打印模板; 无记忆返回 null。 */
export function fetchPrintTemplatePreference(
  projectId: EntityId,
  billType: string,
  signal?: AbortSignal,
): Promise<ProjectPrintPreference | null> {
  return apiGetOptional(
    ENDPOINTS.PRINT_TEMPLATE_PREFERENCES,
    projectPrintPreferenceSchema,
    {
      params: { projectId, billType },
      ...(signal ? { signal } : {}),
    },
  )
}

/** 记录项目在某单据类型下本次所选打印模板(幂等新增/更新)。 */
export function savePrintTemplatePreference(payload: {
  projectId: EntityId
  billType: string
  templateId: EntityId
}) {
  return apiPut(
    ENDPOINTS.PRINT_TEMPLATE_PREFERENCES,
    projectPrintPreferenceSchema,
    payload,
    withIdempotencyKey(),
  )
}
