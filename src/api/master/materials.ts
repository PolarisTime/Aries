import { z } from 'zod'
import { apiGet, apiPost, downloadGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'
import type { ModuleRecord } from '@/types/module-page'
import { downloadBlob } from '@/utils/download'

const materialSearchResponseSchema = z.array(
  z.looseObject({ id: z.unknown().optional() }),
)

const materialImportRowSchema = z.object({
  rowNumber: z.number(),
  materialCode: z.string().nullable(),
  brand: z.string().nullable(),
  material: z.string().nullable(),
  spec: z.string().nullable(),
  length: z.string().nullable(),
  outcome: z.enum(['CREATED', 'UPDATED', 'SKIPPED', 'FAILED']),
  reason: z.string().nullable(),
})

const materialImportResponseSchema = z.object({
  totalRows: z.number(),
  successCount: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  skippedCount: z.number(),
  failedCount: z.number(),
  failures: z.array(
    z.object({
      rowNumber: z.number(),
      materialCode: z.string().nullable(),
      reason: z.string(),
    }),
  ),
  rows: z.array(materialImportRowSchema),
})

export type MaterialImportResponse = z.infer<
  typeof materialImportResponseSchema
>
export type MaterialImportRowResult = z.infer<typeof materialImportRowSchema>
export type MaterialImportOutcome = MaterialImportRowResult['outcome']

export type MaterialSearchResponse = Omit<ModuleRecord, 'id'> & {
  id: EntityId
  materialCode?: string
  brand?: string
  category?: string
  material?: string
  spec?: string
  length?: string
  unit?: string
  quantityUnit?: string
  pieceWeightTon?: number
  piecesPerBundle?: number
  unitPrice?: number
  remark?: string
}

type RawMaterialSearchResponse = Omit<MaterialSearchResponse, 'id'> & {
  id?: unknown
}

function normalizeMaterialSearchRows(
  rows: RawMaterialSearchResponse[],
): MaterialSearchResponse[] {
  return rows.map((row, index) => ({
    ...row,
    id: parseEntityId(row.id, `materials[${index}].id`),
  }))
}

export interface MaterialImportError {
  row: number
  field: string
  message: string
}

export interface MaterialImportResult {
  totalRows: number
  successCount: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  failCount: number
  errors: MaterialImportError[]
  successRows?: unknown[]
}

export async function fetchMaterialSearch(
  keyword = '',
  limit = 200,
): Promise<MaterialSearchResponse[]> {
  const response = await apiGet(
    ENDPOINTS.MATERIALS_SEARCH,
    materialSearchResponseSchema,
    {
      params: {
        keyword,
        limit,
      },
    },
  )

  if (!Array.isArray(response)) {
    return []
  }

  return normalizeMaterialSearchRows(response)
}

export async function downloadMaterialImportTemplate() {
  const blob = await downloadGet(ENDPOINTS.MATERIALS_TEMPLATE)
  downloadBlob(blob, '商品资料导入模板.xlsx')
}

export async function importMaterialFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return apiPost(
    ENDPOINTS.MATERIALS_IMPORT,
    materialImportResponseSchema,
    formData,
  )
}
