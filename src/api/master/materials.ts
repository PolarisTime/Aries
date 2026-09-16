import { z } from 'zod'
import { apiGet, apiPost, downloadGet } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { fetchGeneratedMasterDataCode } from '@/api/master/master-data-codes'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  exactPageSchema,
  responseNonNegativeIntegerSchema,
} from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import type { ModuleRecord } from '@/types/module-page'
import { downloadBlob } from '@/utils/download'

const materialSearchRowSchema = z.looseObject({ id: z.unknown().optional() })

const materialSearchPageResponseSchema = exactPageSchema(
  materialSearchRowSchema,
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
  /** 后端当前仅在历史记录中携带批次号；此处宽松兼容，缺失时优雅降级。 */
  importBatchNo: z.string().nullish(),
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
  materialType?: string
}

export type MaterialSearchPageResponse = {
  content: MaterialSearchResponse[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasMore: boolean
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
  materialType?: string,
  signal?: AbortSignal,
): Promise<MaterialSearchPageResponse> {
  const response = await apiGet(
    ENDPOINTS.MATERIALS,
    materialSearchPageResponseSchema,
    {
      params: {
        keyword,
        page: 0,
        // 后端 PageQuery 上限为 200，超出会返回 422
        size: Math.min(Math.max(limit, 1), 200),
        ...(materialType ? { materialType } : {}),
      },
      ...(signal ? { signal } : {}),
    },
  )

  return {
    ...response,
    content: normalizeMaterialSearchRows(response.content),
  }
}

/** 商品选项分页拉全的页大小：与后端 PageQuery 上限保持一致。 */
const MATERIAL_OPTIONS_PAGE_SIZE = 200

/**
 * 分页拉取全部商品选项。
 * <p>
 * 商品下拉需要在本地做结构化/拼音过滤（如品牌“泸钢”用 “lg” 命中），
 * 只预加载首页 200 条会漏掉默认排序靠后的数据，因此按总页数拉全。
 */
export async function fetchAllMaterialOptions(
  materialType?: string,
  signal?: AbortSignal,
): Promise<MaterialSearchResponse[]> {
  const fetchPage = (page: number) =>
    apiGet(ENDPOINTS.MATERIALS, materialSearchPageResponseSchema, {
      params: {
        keyword: '',
        page,
        size: MATERIAL_OPTIONS_PAGE_SIZE,
        ...(materialType ? { materialType } : {}),
      },
      ...(signal ? { signal } : {}),
    })

  const firstPage = await fetchPage(0)
  const restPages = await Promise.all(
    Array.from({ length: Math.max(firstPage.totalPages - 1, 0) }, (_, index) =>
      fetchPage(index + 1),
    ),
  )
  return normalizeMaterialSearchRows(
    [firstPage, ...restPages].flatMap((page) => page.content),
  )
}

export async function downloadMaterialImportTemplate() {
  const blob = await downloadGet(ENDPOINTS.MATERIALS_TEMPLATE)
  downloadBlob(blob, '商品资料导入模板.xlsx')
}

export async function importMaterialFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  if (file.name.toLowerCase().endsWith('.csv')) {
    formData.append('format', 'csv')
  }

  return apiPost(
    ENDPOINTS.MATERIAL_IMPORTS,
    materialImportResponseSchema,
    formData,
    withIdempotencyKey(),
  )
}

/** 商品字段快照：后端只保证业务字段，未知/新增字段按宽松结构保留。 */
export interface MaterialSnapshot {
  id?: EntityId
  materialCode?: string | null
  brand?: string | null
  material?: string | null
  category?: string | null
  spec?: string | null
  length?: string | null
  unit?: string | null
  quantityUnit?: string | null
  pieceWeightTon?: number | string | null
  piecesPerBundle?: number | string | null
  unitPrice?: number | string | null
  remark?: string | null
  materialType?: string | null
  [key: string]: unknown
}

export interface MaterialFieldChange {
  field: string
  label?: string | null
  before?: string | null
  after?: string | null
}

export type MaterialHistoryChangeSource = 'MANUAL' | 'IMPORT' | 'ROLLBACK'
export type MaterialHistoryChangeType =
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'ROLLBACK'

export interface MaterialHistoryRecord {
  id: EntityId
  materialId: EntityId
  changeSource: string
  changeType: string
  before: MaterialSnapshot | null
  after: MaterialSnapshot | null
  importBatchNo: string | null
  remark: string | null
  changedBy: EntityId | null
  changedAt: string | null
}

export interface MaterialHistoryPageResponse {
  content: MaterialHistoryRecord[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasMore: boolean
}

export type MaterialImportPreviewOutcome =
  | 'CREATED'
  | 'UPDATED'
  | 'SKIPPED'
  | 'FAILED'

export interface MaterialImportPreviewRow {
  rowNumber: number
  materialCode: string | null
  brand: string | null
  material: string | null
  spec: string | null
  length: string | null
  outcome: MaterialImportPreviewOutcome
  materialId: EntityId | null
  changes: MaterialFieldChange[]
  reason: string | null
}

export interface MaterialImportPreviewResponse {
  totalRows: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  rows: MaterialImportPreviewRow[]
}

export interface MaterialBatchRollbackResult {
  importBatchNo: string
  totalRows: number
  createdRolledBack: number
  updatedRestored: number
  missing: number
}

// 快照按宽松结构接收：非对象值在归一化阶段降级为 null，避免契约过度收紧。
const materialSnapshotSchema = z.unknown()

const materialFieldChangeSchema = z.looseObject({
  field: z.string(),
  label: z.string().nullish(),
  before: z.string().nullish(),
  after: z.string().nullish(),
})

const materialHistoryRowSchema = z.looseObject({
  id: z.unknown(),
  materialId: z.unknown(),
  changeSource: z.string(),
  changeType: z.string(),
  before: materialSnapshotSchema,
  after: materialSnapshotSchema,
  importBatchNo: z.string().nullish(),
  remark: z.string().nullish(),
  changedBy: z.unknown().nullish(),
  changedAt: z.string().nullish(),
})

const materialHistoryPageResponseSchema = exactPageSchema(
  materialHistoryRowSchema,
)

const materialImportPreviewRowSchema = z.looseObject({
  rowNumber: z.number(),
  materialCode: z.string().nullish(),
  brand: z.string().nullish(),
  material: z.string().nullish(),
  spec: z.string().nullish(),
  length: z.string().nullish(),
  outcome: z.enum(['CREATED', 'UPDATED', 'SKIPPED', 'FAILED']),
  materialId: z.unknown().nullish(),
  changes: z.array(materialFieldChangeSchema).nullish(),
  reason: z.string().nullish(),
})

const materialImportPreviewResponseSchema = z.looseObject({
  totalRows: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  skippedCount: z.number(),
  failedCount: z.number(),
  rows: z.array(materialImportPreviewRowSchema),
})

const materialBatchRollbackResponseSchema = z.looseObject({
  importBatchNo: z.string(),
  // 后端字段为 totalRows；兼容旧文档/早期实现的 total 命名。
  totalRows: responseNonNegativeIntegerSchema.optional(),
  total: responseNonNegativeIntegerSchema.optional(),
  createdRolledBack: responseNonNegativeIntegerSchema,
  updatedRestored: responseNonNegativeIntegerSchema,
  missing: responseNonNegativeIntegerSchema,
})

function toMaterialSnapshot(value: unknown): MaterialSnapshot | null {
  if (value === null || value === undefined || typeof value !== 'object') {
    return null
  }
  if (Array.isArray(value)) {
    return null
  }
  const record = { ...(value as Record<string, unknown>) }
  if (record.id !== null && record.id !== undefined) {
    record.id = parseOptionalEntityId(record.id, 'materialHistory.snapshot.id')
  }
  return record
}

function normalizeMaterialHistoryRows(
  rows: z.infer<typeof materialHistoryRowSchema>[],
): MaterialHistoryRecord[] {
  return rows.map((row, index) => ({
    id: parseEntityId(row.id, `materialHistories[${index}].id`),
    materialId: parseEntityId(
      row.materialId,
      `materialHistories[${index}].materialId`,
    ),
    changeSource: row.changeSource,
    changeType: row.changeType,
    before: toMaterialSnapshot(row.before),
    after: toMaterialSnapshot(row.after),
    importBatchNo: row.importBatchNo ?? null,
    remark: row.remark ?? null,
    changedBy:
      row.changedBy === null || row.changedBy === undefined
        ? null
        : (parseOptionalEntityId(
            row.changedBy,
            `materialHistories[${index}].changedBy`,
          ) ?? null),
    changedAt: row.changedAt ?? null,
  }))
}

function normalizeMaterialImportPreviewRow(
  row: z.infer<typeof materialImportPreviewRowSchema>,
  index: number,
): MaterialImportPreviewRow {
  return {
    rowNumber: row.rowNumber,
    materialCode: row.materialCode ?? null,
    brand: row.brand ?? null,
    material: row.material ?? null,
    spec: row.spec ?? null,
    length: row.length ?? null,
    outcome: row.outcome,
    materialId:
      row.materialId === null || row.materialId === undefined
        ? null
        : (parseOptionalEntityId(
            row.materialId,
            `materialImportPreviews[${index}].materialId`,
          ) ?? null),
    changes: (row.changes ?? []).map((change) => ({
      field: change.field,
      label: change.label ?? null,
      before: change.before ?? null,
      after: change.after ?? null,
    })),
    reason: row.reason ?? null,
  }
}

const MATERIAL_SNAPSHOT_FIELDS = [
  'materialCode',
  'brand',
  'material',
  'category',
  'spec',
  'length',
  'unit',
  'quantityUnit',
  'pieceWeightTon',
  'piecesPerBundle',
  'unitPrice',
  'remark',
  'materialType',
] as const

function snapshotScalar(
  snapshot: MaterialSnapshot | null,
  field: string,
): string | null {
  const value = snapshot?.[field]
  if (value === null || value === undefined || value === '') {
    return null
  }
  return String(value)
}

/**
 * 依据历史记录的前后快照计算变更字段差异。
 * before 为 null（新建）时列出 after 的全部非空字段；after 为 null（删除）时列出 before。
 */
export function diffMaterialSnapshots(
  before: MaterialSnapshot | null,
  after: MaterialSnapshot | null,
): MaterialFieldChange[] {
  const changes: MaterialFieldChange[] = []
  for (const field of MATERIAL_SNAPSHOT_FIELDS) {
    const beforeValue = snapshotScalar(before, field)
    const afterValue = snapshotScalar(after, field)
    if (beforeValue === afterValue) {
      continue
    }
    changes.push({ field, before: beforeValue, after: afterValue })
  }
  return changes
}

export async function fetchMaterialHistories(
  materialId: EntityId,
  page = 1,
  size = 10,
  signal?: AbortSignal,
): Promise<MaterialHistoryPageResponse> {
  const response = await apiGet(
    ENDPOINTS.MATERIAL_HISTORIES(materialId),
    materialHistoryPageResponseSchema,
    {
      params: {
        page: Math.max(page - 1, 0),
        // 后端 PageQuery 上限为 200，超出会返回 422
        size: Math.min(Math.max(size, 1), 200),
        sortBy: 'id',
        direction: 'desc',
      },
      ...(signal ? { signal } : {}),
    },
  )

  return {
    ...response,
    content: normalizeMaterialHistoryRows(response.content),
  }
}

export async function previewMaterialImportFile(
  file: File,
): Promise<MaterialImportPreviewResponse> {
  const formData = new FormData()
  formData.append('file', file)
  if (file.name.toLowerCase().endsWith('.csv')) {
    formData.append('format', 'csv')
  }

  const response = await apiPost(
    ENDPOINTS.MATERIAL_IMPORT_PREVIEWS,
    materialImportPreviewResponseSchema,
    formData,
    withIdempotencyKey(),
  )

  return {
    ...response,
    rows: response.rows.map(normalizeMaterialImportPreviewRow),
  }
}

export async function rollbackMaterialImportBatch(
  importBatchNo: string,
): Promise<MaterialBatchRollbackResult> {
  const raw = await apiPost(
    ENDPOINTS.IMPORT_BATCH_ROLLBACKS(importBatchNo),
    materialBatchRollbackResponseSchema,
    undefined,
    withIdempotencyKey(),
  )

  return {
    importBatchNo: raw.importBatchNo,
    totalRows: raw.totalRows ?? raw.total ?? 0,
    createdRolledBack: raw.createdRolledBack,
    updatedRestored: raw.updatedRestored,
    missing: raw.missing,
  }
}

/** 单据费用下拉快捷新增返回的新主数据信息，用于回填当前费用行。 */
export interface CreatedExpenseMaterial {
  id: string
  name: string
  unit: string
}

/** 单据费用下拉快捷新增：静默创建附加费用类主数据。 */
export async function createExpenseMaterial(
  name: string,
): Promise<CreatedExpenseMaterial> {
  // 主数据编码必须由后端签发，否则会被 @NotBlank 与服务层签发校验拒绝。
  const materialCode = await fetchGeneratedMasterDataCode('material')
  const response = await apiPost(
    ENDPOINTS.MATERIALS,
    z.looseObject({ id: z.string() }),
    {
      materialCode,
      brand: '',
      material: name,
      category: '附加费用',
      spec: '',
      length: '',
      unit: '次',
      quantityUnit: '次',
      pieceWeightTon: 0,
      piecesPerBundle: 0,
      unitPrice: 0,
      remark: '单据录入快捷新增',
      materialType: '附加费用',
    },
    withIdempotencyKey(),
  )
  return { id: String(response.id), name, unit: '次' }
}
