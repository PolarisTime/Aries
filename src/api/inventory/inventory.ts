import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { exactPageSchema, responseEntityIdSchema } from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import { asArray, asNumber, asString } from '@/utils/type-narrowing'

type RawRecord = Record<string, unknown>

/** 后端 v2 PageResponse 的客户端归一化结构。 */
export interface InventoryPage<TRow> {
  content: TRow[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasMore: boolean
}

export interface InventoryBalanceQuery {
  page: number
  size: number
  sortBy?: string
  direction?: string
  keyword?: string
  materialId?: EntityId
  warehouseId?: EntityId
}

export interface InventoryBalance {
  key: string
  materialId: EntityId
  materialCode: string
  brand: string
  material: string
  spec: string
  length: string
  unit: string
  warehouseId: EntityId
  warehouseName: string
  batchNo: string
  quantity: number
  amount: number
  avgUnitCost: number
}

export interface InventoryTransactionQuery {
  page: number
  size: number
  sortBy?: string
  direction?: string
  keyword?: string
  materialId?: EntityId
  warehouseId?: EntityId
  transactionType?: string
  startDate?: string
  endDate?: string
}

/** direction 为 ±1，负数代表出库，正数代表入库。 */
export interface InventoryTransaction {
  key: string
  id: EntityId
  transactionNo: string
  transactionType: string
  materialId: EntityId
  materialCode: string
  warehouseId: EntityId
  warehouseName: string
  batchNo: string
  direction: number
  quantity: number
  quantityUnit: string
  unitCost: number
  amount: number
  sourceDocumentType: string
  sourceDocumentId?: EntityId
  sourceDocumentNo: string
  sourceItemId?: EntityId
  occurredAt: string
  createdAt: string
}

const decimalSchema = z.union([z.number(), z.string()])

export const inventoryBalanceRowSchema = z.looseObject({
  materialId: responseEntityIdSchema,
  materialCode: z.string().nullish(),
  brand: z.string().nullish(),
  material: z.string().nullish(),
  spec: z.string().nullish(),
  length: z.string().nullish(),
  unit: z.string().nullish(),
  warehouseId: responseEntityIdSchema,
  warehouseName: z.string().nullish(),
  batchNo: z.string().nullish(),
  quantity: decimalSchema,
  amount: decimalSchema,
  avgUnitCost: decimalSchema,
})

export const inventoryTransactionRowSchema = z.looseObject({
  id: responseEntityIdSchema,
  transactionNo: z.string().nullish(),
  transactionType: z.string().nullish(),
  materialId: responseEntityIdSchema,
  materialCode: z.string().nullish(),
  warehouseId: responseEntityIdSchema,
  warehouseName: z.string().nullish(),
  batchNo: z.string().nullish(),
  direction: decimalSchema.nullish(),
  quantity: decimalSchema,
  quantityUnit: z.string().nullish(),
  unitCost: decimalSchema,
  amount: decimalSchema,
  sourceDocumentType: z.string().nullish(),
  sourceDocumentId: responseEntityIdSchema.nullish(),
  sourceDocumentNo: z.string().nullish(),
  sourceItemId: responseEntityIdSchema.nullish(),
  occurredAt: z.string().nullish(),
  createdAt: z.string().nullish(),
})

export const inventoryBalancesResponseSchema = exactPageSchema(
  inventoryBalanceRowSchema,
)

export const inventoryTransactionsResponseSchema = exactPageSchema(
  inventoryTransactionRowSchema,
)

function normalizePage<TRow>(
  raw: RawRecord | null | undefined,
  mapRow: (row: RawRecord, index: number) => TRow,
): InventoryPage<TRow> {
  const source = raw || {}
  return {
    content: asArray<RawRecord>(source.content).map(mapRow),
    totalElements: asNumber(source.totalElements),
    totalPages: asNumber(source.totalPages),
    currentPage: asNumber(source.currentPage),
    pageSize: asNumber(source.pageSize),
    hasMore: source.hasMore === true,
  }
}

function normalizeCommonFilter(filter: {
  sortBy?: string
  direction?: string
  keyword?: string
  materialId?: EntityId
  warehouseId?: EntityId
}) {
  const sortBy = filter.sortBy?.trim()
  const direction = filter.direction?.trim()
  const keyword = filter.keyword?.trim()
  const materialId = parseOptionalEntityId(filter.materialId, 'materialId')
  const warehouseId = parseOptionalEntityId(filter.warehouseId, 'warehouseId')
  return {
    ...(sortBy ? { sortBy } : {}),
    ...(direction ? { direction } : {}),
    ...(keyword ? { keyword } : {}),
    ...(materialId ? { materialId } : {}),
    ...(warehouseId ? { warehouseId } : {}),
  }
}

function normalizeBalance(raw: RawRecord, index: number): InventoryBalance {
  const materialId = parseEntityId(
    raw.materialId,
    `inventoryBalances.content[${index}].materialId`,
  )
  const warehouseId = parseEntityId(
    raw.warehouseId,
    `inventoryBalances.content[${index}].warehouseId`,
  )
  const batchNo = asString(raw.batchNo)
  return {
    key: `${materialId}-${warehouseId}-${batchNo}-${index}`,
    materialId,
    materialCode: asString(raw.materialCode),
    brand: asString(raw.brand),
    material: asString(raw.material),
    spec: asString(raw.spec),
    length: asString(raw.length),
    unit: asString(raw.unit),
    warehouseId,
    warehouseName: asString(raw.warehouseName),
    batchNo,
    quantity: asNumber(raw.quantity),
    amount: asNumber(raw.amount),
    avgUnitCost: asNumber(raw.avgUnitCost),
  }
}

function normalizeTransaction(
  raw: RawRecord,
  index: number,
): InventoryTransaction {
  const id = parseEntityId(raw.id, `inventoryTransactions.content[${index}].id`)
  return {
    key: id,
    id,
    transactionNo: asString(raw.transactionNo),
    transactionType: asString(raw.transactionType),
    materialId: parseEntityId(
      raw.materialId,
      `inventoryTransactions.content[${index}].materialId`,
    ),
    materialCode: asString(raw.materialCode),
    warehouseId: parseEntityId(
      raw.warehouseId,
      `inventoryTransactions.content[${index}].warehouseId`,
    ),
    warehouseName: asString(raw.warehouseName),
    batchNo: asString(raw.batchNo),
    direction: asNumber(raw.direction),
    quantity: asNumber(raw.quantity),
    quantityUnit: asString(raw.quantityUnit),
    unitCost: asNumber(raw.unitCost),
    amount: asNumber(raw.amount),
    sourceDocumentType: asString(raw.sourceDocumentType),
    sourceDocumentId: parseOptionalEntityId(
      raw.sourceDocumentId,
      `inventoryTransactions.content[${index}].sourceDocumentId`,
    ),
    sourceDocumentNo: asString(raw.sourceDocumentNo),
    sourceItemId: parseOptionalEntityId(
      raw.sourceItemId,
      `inventoryTransactions.content[${index}].sourceItemId`,
    ),
    occurredAt: asString(raw.occurredAt),
    createdAt: asString(raw.createdAt),
  }
}

export async function getInventoryBalances(
  query: InventoryBalanceQuery,
  signal?: AbortSignal,
): Promise<InventoryPage<InventoryBalance>> {
  const response = await apiGet(
    ENDPOINTS.INVENTORY_BALANCES,
    inventoryBalancesResponseSchema,
    {
      params: {
        ...normalizeCommonFilter(query),
        page: Math.max(Math.trunc(query.page), 0),
        size: Math.max(Math.trunc(query.size), 1),
      },
      signal,
    },
  )
  return normalizePage(response, normalizeBalance)
}

export async function getInventoryTransactions(
  query: InventoryTransactionQuery,
  signal?: AbortSignal,
): Promise<InventoryPage<InventoryTransaction>> {
  const transactionType = query.transactionType?.trim()
  const startDate = query.startDate?.trim()
  const endDate = query.endDate?.trim()
  const response = await apiGet(
    ENDPOINTS.INVENTORY_TRANSACTIONS,
    inventoryTransactionsResponseSchema,
    {
      params: {
        ...normalizeCommonFilter(query),
        ...(transactionType ? { transactionType } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        page: Math.max(Math.trunc(query.page), 0),
        size: Math.max(Math.trunc(query.size), 1),
      },
      signal,
    },
  )
  return normalizePage(response, normalizeTransaction)
}
