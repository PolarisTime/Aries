import { z } from 'zod'
import { apiDeleteNoContent, apiGet, apiPost, apiPut } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import { STATUS } from '@/constants/status-constants'
import type { EntityId } from '@/types/entity-id'

/**
 * 供应商价格表（比价一手价）客户端。
 *
 * <p>业务形态：**一个品牌一张表，规格做行、供应商做列**，格子里是该供应商对该规格的报价。
 * 存储侧是「(品牌, 供应商) 一条表头 + 该供应商的规格条目」，前端只关心网格。</p>
 *
 * <p>价格用 `number | null`：`null` 表示**不报价**，与 0 元严格区分（0 元是真实价格）。
 * 提交时省略 `null` 的格子，服务端据此删除条目 —— 这是"清空一个格子的价"能真正落库的前提。</p>
 */

/** 一列 = 一家供应商在这张品牌表里的价格表头。 */
export type SupplierPriceColumn = {
  listId: EntityId
  supplierId: EntityId
  supplierName: string
  quotedOn: string | null
  updatedAt: string | null
  warehouse: string | null
  /** 乐观锁版本号：保存该列格子时必须回传，冲突后端返回 409。 */
  version: number
}

/** 一行 = 一个商品规格；`prices` 缺少某列键表示该供应商不报这个规格。 */
export type SupplierPriceRow = {
  category: string
  material: string
  spec: number
  length: string
  prices: Record<string, number>
  priceStatuses: Record<string, string>
  remarks: Record<string, string>
}

export type SupplierPriceGrid = {
  brandName: string
  columns: SupplierPriceColumn[]
  rows: SupplierPriceRow[]
}

/** 提交给保存接口的单个格子。 */
export type SupplierPriceCellInput = {
  category: string
  material: string
  spec: number
  length: string
  price: number
  priceStatus?: string
  remark?: string
}

const numberLike = z.union([z.number(), z.string()])

const columnSchema = z.looseObject({
  listId: z.unknown(),
  supplierId: z.unknown(),
  supplierName: z.string().nullish(),
  quotedOn: z.string().nullish(),
  updatedAt: z.string().nullish(),
  warehouse: z.string().nullish(),
  version: numberLike.nullish(),
})

const rowSchema = z.looseObject({
  category: z.string().nullish(),
  material: z.string().nullish(),
  spec: numberLike.nullish(),
  length: z.string().nullish(),
  prices: z.record(z.string(), numberLike).nullish(),
  priceStatuses: z.record(z.string(), z.string()).nullish(),
  remarks: z.record(z.string(), z.string()).nullish(),
})

const gridSchema = z.looseObject({
  brandName: z.string().nullish(),
  columns: z.array(columnSchema).nullish(),
  rows: z.array(rowSchema).nullish(),
})

const lowestQuoteSchema = z.looseObject({
  brandName: z.string().nullish(),
  category: z.string().nullish(),
  material: z.string().nullish(),
  spec: numberLike.nullish(),
  length: z.string().nullish(),
  price: numberLike.nullish(),
  priceListId: z.unknown().optional(),
  supplierId: z.unknown().optional(),
  supplierName: z.string().nullish(),
})

/** 批量最低价的一行：报单比价按 (品牌, 商品) 直接落到格子上。 */
export type BrandLowestQuote = {
  brandName: string
  category: string
  material: string
  spec: number
  length: string
  price: number
  priceListId: EntityId
  supplierId: EntityId
  supplierName: string
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toId = (value: unknown): EntityId =>
  value === null || value === undefined ? '' : String(value)

export async function fetchSupplierPriceGrid(
  brandName: string,
  signal?: AbortSignal,
): Promise<SupplierPriceGrid> {
  const payload = await apiGet(
    `${ENDPOINTS.SUPPLIER_PRICE_LISTS}/grid`,
    gridSchema,
    { params: { brandName }, ...(signal ? { signal } : {}) },
  )
  return {
    brandName: payload.brandName ?? brandName,
    columns: (payload.columns ?? []).map((column) => ({
      listId: toId(column.listId),
      supplierId: toId(column.supplierId),
      supplierName: column.supplierName ?? '',
      quotedOn: column.quotedOn ?? null,
      updatedAt: column.updatedAt ?? null,
      warehouse: column.warehouse ?? null,
      version: toNumber(column.version) ?? 0,
    })),
    rows: (payload.rows ?? []).map((row) => {
      const prices: Record<string, number> = {}
      for (const [key, value] of Object.entries(row.prices ?? {})) {
        const price = toNumber(value)
        if (price !== null) prices[key] = price
      }
      return {
        category: row.category ?? '',
        material: row.material ?? '',
        spec: toNumber(row.spec) ?? 0,
        length: row.length ?? '',
        prices,
        priceStatuses: row.priceStatuses ?? {},
        remarks: row.remarks ?? {},
      }
    }),
  }
}

/** 增加一列：某品牌下接入一家供应商。 */
export async function addSupplierPriceColumn(input: {
  brandName: string
  supplierId: EntityId
  quotedOn?: string
  warehouse?: string
}): Promise<SupplierPriceColumn> {
  // 写操作必须带幂等键：后端 V2SupplierPriceListController 类级 @IdempotencyRequired
  const payload = await apiPost(
    ENDPOINTS.SUPPLIER_PRICE_LISTS,
    columnSchema,
    input,
    withIdempotencyKey(),
  )
  return {
    listId: toId(payload.listId),
    supplierId: toId(payload.supplierId),
    supplierName: payload.supplierName ?? '',
    quotedOn: payload.quotedOn ?? null,
    updatedAt: payload.updatedAt ?? null,
    warehouse: payload.warehouse ?? null,
    version: toNumber(payload.version) ?? 0,
  }
}

/** 去掉一列（软删除，只影响该品牌下的这家供应商）。 */
export async function removeSupplierPriceColumn(
  listId: EntityId,
): Promise<void> {
  await apiDeleteNoContent(
    `${ENDPOINTS.SUPPLIER_PRICE_LISTS}/${listId}`,
    withIdempotencyKey(),
  )
}

/** 保存某一列的全部格子（整组替换；`expectedVersion` 冲突时后端返回 409）。 */
export async function saveSupplierPriceColumnItems(
  listId: EntityId,
  expectedVersion: number,
  items: SupplierPriceCellInput[],
): Promise<SupplierPriceColumn> {
  const payload = await apiPut(
    `${ENDPOINTS.SUPPLIER_PRICE_LISTS}/${listId}/items`,
    columnSchema,
    { expectedVersion, items },
    withIdempotencyKey(),
  )
  return {
    listId: toId(payload.listId),
    supplierId: toId(payload.supplierId),
    supplierName: payload.supplierName ?? '',
    quotedOn: payload.quotedOn ?? null,
    updatedAt: payload.updatedAt ?? null,
    warehouse: payload.warehouse ?? null,
    version: toNumber(payload.version) ?? 0,
  }
}

/** 批量最低价：按 (品牌, 商品) 各取最低的一家，供报单比价一次填满整张表。 */
export async function fetchLowestBrandQuotes(
  brandName?: string,
  signal?: AbortSignal,
): Promise<BrandLowestQuote[]> {
  const payload = await apiGet(
    `${ENDPOINTS.SUPPLIER_PRICE_LISTS}/lowest-quotes`,
    z.array(lowestQuoteSchema),
    {
      ...(brandName ? { params: { brandName } } : {}),
      ...(signal ? { signal } : {}),
    },
  )
  const quotes: BrandLowestQuote[] = []
  for (const row of payload) {
    const price = toNumber(row.price)
    const spec = toNumber(row.spec)
    // 价格或规格缺失的行无法定位到格子，直接跳过（不该出现，出现也不该污染界面）
    if (price === null || spec === null) continue
    quotes.push({
      brandName: row.brandName ?? '',
      category: row.category ?? '',
      material: row.material ?? '',
      spec,
      length: row.length ?? '',
      price,
      priceListId: toId(row.priceListId),
      supplierId: toId(row.supplierId),
      supplierName: row.supplierName ?? '',
    })
  }
  return quotes
}

/** 商品规格行（「规格列满」的数据来源：商品资料全量规格）。 */
export type SupplierPriceSpecRow = {
  category: string
  material: string
  spec: number
  length: string
}

const specRowSchema = z.looseObject({
  category: z.string().nullish(),
  material: z.string().nullish(),
  spec: numberLike.nullish(),
  length: z.string().nullish(),
})

const specPageSchema = z.looseObject({
  content: z.array(specRowSchema).nullish(),
})

/**
 * 拉取商品资料里的全部规格，作为品牌价格表的行。
 *
 * <p>「规格列满」的含义就是：表里把所有规格都列出来，供应商报了哪个就填哪个 —— 因此行不能只
 * 取"已有报价"的那些。</p>
 *
 * <p><b>页大小必须 ≤ 200</b>：后端分页校验是「size 必须在 1 到 200 之间」，超过直接 422；
 * 用 500 时整个查询失败，页面会显示"没有可录入的规格"（实测踩过）。这里按 200/页翻页，
 * 最多 50 页（1 万行）兜底，避免数据异常时无限翻页。</p>
 */
export async function fetchSpecRows(
  signal?: AbortSignal,
): Promise<SupplierPriceSpecRow[]> {
  const rows: SupplierPriceSpecRow[] = []
  const size = 200
  for (let page = 0; page < 50; page += 1) {
    const payload = await apiGet(ENDPOINTS.MATERIALS, specPageSchema, {
      // 报价表的行来自商品资料：禁用商品不再出现在报价表里，历史报价数据保持只读
      params: { keyword: '', page, size, status: STATUS.NORMAL },
      ...(signal ? { signal } : {}),
    })
    const content = payload.content ?? []
    for (const row of content) {
      const spec = toNumber(row.spec)
      // 规格必须是正整数（后端条目表 spec 是 integer）；杂费类等无规格的行不参与价格表
      if (spec === null || !Number.isInteger(spec) || spec <= 0) continue
      rows.push({
        category: row.category ?? '',
        material: row.material ?? '',
        spec,
        length: row.length ?? '',
      })
    }
    if (content.length < size) break
  }
  return rows
}
