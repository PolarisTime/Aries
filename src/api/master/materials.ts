import { z } from 'zod'
import {
  apiGet,
  apiPost,
  assertApiSuccess,
  downloadGet,
} from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { apiResponseSchema } from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'
import type { ModuleRecord } from '@/types/module-page'
import { downloadBlob } from '@/utils/download'

const materialSearchResponseSchema = apiResponseSchema(
  z.array(z.looseObject({ id: z.unknown().optional() })),
)

const materialImportResponseSchema = apiResponseSchema(
  z.object({
    totalRows: z.number(),
    successCount: z.number(),
    createdCount: z.number(),
    updatedCount: z.number(),
    skippedCount: z.number(),
    failCount: z.number(),
    errors: z.array(
      z.object({
        row: z.number(),
        field: z.string(),
        message: z.string(),
      }),
    ),
    successRows: z.array(z.unknown()).optional(),
  }),
)

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

  if (Number(response.code) !== 0 || !Array.isArray(response.data)) {
    return []
  }

  return normalizeMaterialSearchRows(response.data)
}

export async function downloadMaterialImportTemplate() {
  const blob = await downloadGet(ENDPOINTS.MATERIALS_TEMPLATE)
  downloadBlob(blob, '商品资料导入模板.xlsx')
}

export async function importMaterialFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiPost(
    ENDPOINTS.MATERIALS_IMPORT,
    materialImportResponseSchema,
    formData,
  )

  assertApiSuccess(response)
  return response.data
}
