import { z } from 'zod'
import {
  apiDeleteNoContent,
  apiDeleteResponse,
  apiGet,
  apiPost,
  apiPostResponse,
  apiPut,
  apiPutResponse,
} from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'
import {
  normalizeVersion,
  readResourceVersionHeader,
  withConcurrencyHeaders,
} from './quote-concurrency'

/** 数字或数字字符串统一为 number; 空值返回 undefined。 */
function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const brandSchema = z.looseObject({
  brandName: z.string(),
  freight: z.union([z.number(), z.string()]).nullable().optional(),
  sortOrder: z.union([z.number(), z.string()]).nullable().optional(),
})

const priceSchema = z.looseObject({
  brandName: z.string(),
  spotPrice: z.union([z.number(), z.string()]).nullable().optional(),
  /**
   * 价格表推导值(不含手填覆盖), 供「恢复为价格表价」预览。
   * 现货价不再要求人工填写: 后端按该单据报价时刻生效的供应商价格表推导。
   */
  derivedSpotPrice: z.union([z.number(), z.string()]).nullable().optional(),
  /** 现货价来源: 手填覆盖 / 价格表推导 / 无。 */
  spotSource: z.string().nullable().optional(),
  /** 无价原因: 该时刻无生效版本 / 无该条目 / 条目不报价。 */
  spotReason: z.string().nullable().optional(),
  supplierId: z.union([z.number(), z.string()]).nullable().optional(),
  supplierName: z.string().nullable().optional(),
  /** 项目级运费(元/吨), 来自项目品牌配置, 不来自价格表。 */
  freight: z.union([z.number(), z.string()]).nullable().optional(),
  /** 已落库覆盖行的来源快照。 */
  priceSource: z.string().nullable().optional(),
  priceListId: z.union([z.number(), z.string()]).nullable().optional(),
  priceListReleasedAt: z.string().nullable().optional(),
})

const itemSchema = z.looseObject({
  id: z.unknown(),
  rowType: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  spec: z.union([z.number(), z.string()]).nullable().optional(),
  length: z.string().nullable().optional(),
  ton: z.union([z.number(), z.string()]).nullable().optional(),
  remark: z.string().nullable().optional(),
  locked: z.boolean().nullable().optional(),
  purchaseOrderId: z.union([z.number(), z.string()]).nullable().optional(),
  purchaseOrderNo: z.string().nullable().optional(),
  purchaseOrderItemId: z.union([z.number(), z.string()]).nullable().optional(),
  prices: z.array(priceSchema).nullable().optional(),
})

const sheetSchema = z.looseObject({
  id: z.unknown(),
  sheetNo: z.string().nullable().optional(),
  name: z.string(),
  projectId: z.union([z.number(), z.string()]).nullable().optional(),
  projectName: z.string().nullable().optional(),
  orderDate: z.string(),
  refDate: z.string(),
  refPeriod: z.string(),
  lengthPremium: z.union([z.number(), z.string()]).nullable().optional(),
  locked: z.boolean().nullable().optional(),
  specQuantityLocked: z.boolean().nullable().optional(),
  status: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  brands: z.array(brandSchema).nullable().optional(),
  items: z.array(itemSchema).nullable().optional(),
  version: z.union([z.number(), z.string()]).nullable().optional(),
})

const sheetPageSchema = z.looseObject({
  content: z.array(sheetSchema),
  totalElements: z.union([z.number(), z.string()]),
  totalPages: z.number(),
  currentPage: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
})

/** 现货价来源: MANUAL 单据手填/覆盖, PRICE_LIST 由供应商价格表推导, NONE 无价。 */
export type SpotPriceSource = 'MANUAL' | 'PRICE_LIST' | 'NONE'
/** 无价原因: 报价时刻无生效价格表版本 / 有版本但无该条目 / 条目存在但不报价。 */
export type SpotPriceReason = 'NO_LIST_AT_TIME' | 'NO_ITEM' | 'NO_PRICE'

const asSpotSource = (raw: unknown): SpotPriceSource | undefined =>
  raw === 'MANUAL' || raw === 'PRICE_LIST' || raw === 'NONE' ? raw : undefined

const asSpotReason = (raw: unknown): SpotPriceReason | undefined =>
  raw === 'NO_LIST_AT_TIME' || raw === 'NO_ITEM' || raw === 'NO_PRICE'
    ? raw
    : undefined

export type QuoteSheetPriceRecord = {
  brandName: string
  /** 最终现货价 = 手填覆盖值(存在时) 否则价格表推导值。 */
  spotPrice?: number
  /** 价格表推导值(不含手填覆盖)。 */
  derivedSpotPrice?: number
  spotSource?: SpotPriceSource
  spotReason?: SpotPriceReason
  supplierId?: EntityId
  supplierName?: string
  /** 项目级运费(元/吨)。 */
  freight?: number
  /** 覆盖行落库来源: MANUAL 手填覆盖 / PRICE_LIST 已固化的价格表价。 */
  priceSource?: 'MANUAL' | 'PRICE_LIST'
  priceListId?: EntityId
  priceListReleasedAt?: string
}

export type QuoteSheetItemRecord = {
  id: EntityId
  rowType?: 'PRODUCT' | 'SEPARATOR'
  category: string
  material: string
  spec?: number
  length: string
  ton?: number
  remark?: string
  /** 是否锁定(未锁定不可关联采购订单; 隔断行恒为 false)。 */
  locked: boolean
  /** 是否已采购(由 purchaseOrderId 派生; 隔断行恒为 false)。 */
  purchased: boolean
  purchaseOrderId?: EntityId
  purchaseOrderNo?: string
  /** 关联采购订单明细行标识(按规格扣减)。 */
  purchaseOrderItemId?: EntityId
  prices: QuoteSheetPriceRecord[]
}

export type QuoteSheetBrandRecord = {
  brandName: string
  freight: number
  sortOrder: number
}

export type QuoteSheetRecord = {
  id: EntityId
  sheetNo?: string
  name: string
  projectId?: EntityId
  projectName?: string
  orderDate: string
  refDate: string
  refPeriod: string
  lengthPremium: number
  locked: boolean
  specQuantityLocked: boolean
  status?: string
  remark?: string
  brands: QuoteSheetBrandRecord[]
  items: QuoteSheetItemRecord[]
  version: string
}

/** 保存请求体(整体替换)。 */
export type QuoteSheetPayload = {
  name: string
  projectId?: EntityId
  projectName?: string
  orderDate: string
  refDate: string
  refPeriod: string
  lengthPremium: number
  locked: boolean
  specQuantityLocked: boolean
  status?: string
  remark?: string
  brands: QuoteSheetBrandRecord[]
  items: {
    rowType: 'PRODUCT' | 'SEPARATOR'
    category?: string
    material?: string
    spec?: number
    length?: string
    ton?: number
    remark?: string
    locked?: boolean
    purchaseOrderId?: EntityId
    purchaseOrderItemId?: EntityId
    prices: {
      brandName: string
      spotPrice?: number
      supplierId?: EntityId
    }[]
  }[]
}

/** 行级保存请求体(整行替换)。 */
export type QuoteSheetItemPayload = {
  rowType: 'PRODUCT' | 'SEPARATOR'
  category?: string
  material?: string
  spec?: number
  length?: string
  ton?: number
  remark?: string
  locked?: boolean
  purchaseOrderId?: EntityId
  purchaseOrderItemId?: EntityId
  prices: {
    brandName: string
    spotPrice?: number
    supplierId?: EntityId
  }[]
}

/** 表头保存请求体(不携带 brands/items, 后端仅更新表头字段)。 */
export type QuoteSheetHeaderPayload = {
  name: string
  projectId?: EntityId
  projectName?: string
  orderDate: string
  refDate: string
  refPeriod: string
  lengthPremium: number
  locked: boolean
  specQuantityLocked: boolean
  status?: string
  remark?: string
}

function normalizePrice(
  raw: z.infer<typeof priceSchema>,
  index: number,
): QuoteSheetPriceRecord {
  const supplierId = parseOptionalEntityId(
    raw.supplierId,
    `prices[${index}].supplierId`,
  )
  const priceListId = parseOptionalEntityId(
    raw.priceListId,
    `prices[${index}].priceListId`,
  )
  const derivedSpotPrice = toOptionalNumber(raw.derivedSpotPrice)
  const spotSource = asSpotSource(raw.spotSource)
  const spotReason = asSpotReason(raw.spotReason)
  const freight = toOptionalNumber(raw.freight)
  const priceSource =
    raw.priceSource === 'MANUAL' || raw.priceSource === 'PRICE_LIST'
      ? raw.priceSource
      : undefined
  return {
    brandName: raw.brandName,
    ...(toOptionalNumber(raw.spotPrice) !== undefined
      ? { spotPrice: toOptionalNumber(raw.spotPrice) }
      : {}),
    ...(derivedSpotPrice !== undefined ? { derivedSpotPrice } : {}),
    ...(spotSource ? { spotSource } : {}),
    ...(spotReason ? { spotReason } : {}),
    ...(supplierId ? { supplierId } : {}),
    ...(raw.supplierName ? { supplierName: raw.supplierName } : {}),
    ...(freight !== undefined ? { freight } : {}),
    ...(priceSource ? { priceSource } : {}),
    ...(priceListId ? { priceListId } : {}),
    ...(raw.priceListReleasedAt
      ? { priceListReleasedAt: raw.priceListReleasedAt }
      : {}),
  }
}

function normalizeItem(
  item: z.infer<typeof itemSchema>,
  path: string,
): QuoteSheetItemRecord {
  const rowType = item.rowType === 'SEPARATOR' ? 'SEPARATOR' : 'PRODUCT'
  const purchaseOrderId =
    rowType === 'SEPARATOR'
      ? undefined
      : parseOptionalEntityId(item.purchaseOrderId, `${path}.purchaseOrderId`)
  const purchaseOrderItemId =
    rowType === 'SEPARATOR'
      ? undefined
      : parseOptionalEntityId(
          item.purchaseOrderItemId,
          `${path}.purchaseOrderItemId`,
        )
  return {
    id: parseEntityId(item.id, `${path}.id`),
    rowType,
    category: asString(item.category).trim(),
    material: asString(item.material).trim(),
    length: asString(item.length).trim(),
    ...(toOptionalNumber(item.spec) !== undefined
      ? { spec: toOptionalNumber(item.spec) }
      : {}),
    ...(toOptionalNumber(item.ton) !== undefined
      ? { ton: toOptionalNumber(item.ton) }
      : {}),
    ...(asString(item.remark).trim() ? { remark: asString(item.remark) } : {}),
    // 已采购由采购订单关联派生, 不再读取独立布尔字段; 隔断行恒为未采购。
    purchased: purchaseOrderId !== undefined,
    // 隔断行不携带锁定标记。
    locked: rowType === 'SEPARATOR' ? false : Boolean(item.locked),
    ...(purchaseOrderId ? { purchaseOrderId } : {}),
    ...(purchaseOrderId && item.purchaseOrderNo
      ? { purchaseOrderNo: item.purchaseOrderNo }
      : {}),
    ...(purchaseOrderItemId ? { purchaseOrderItemId } : {}),
    prices: (item.prices ?? []).map((price, priceIndex) =>
      normalizePrice(price, priceIndex),
    ),
  }
}

function normalizeSheet(
  raw: z.infer<typeof sheetSchema>,
  index: number,
): QuoteSheetRecord {
  const projectId = parseOptionalEntityId(
    raw.projectId,
    `sheets[${index}].projectId`,
  )
  const items: QuoteSheetItemRecord[] = (raw.items ?? []).map(
    (item, itemIndex) =>
      normalizeItem(item, `sheets[${index}].items[${itemIndex}]`),
  )
  return {
    id: parseEntityId(raw.id, `sheets[${index}].id`),
    name: raw.name,
    orderDate: raw.orderDate,
    refDate: raw.refDate,
    refPeriod: raw.refPeriod,
    lengthPremium: toOptionalNumber(raw.lengthPremium) ?? 30,
    locked: Boolean(raw.locked),
    specQuantityLocked: Boolean(raw.specQuantityLocked),
    brands: (raw.brands ?? []).map((brand, brandIndex) => ({
      brandName: brand.brandName,
      freight: toOptionalNumber(brand.freight) ?? 0,
      sortOrder: toOptionalNumber(brand.sortOrder) ?? brandIndex,
    })),
    items,
    version: normalizeVersion(raw.version) ?? '',
    ...(raw.sheetNo ? { sheetNo: raw.sheetNo } : {}),
    ...(projectId ? { projectId } : {}),
    ...(raw.projectName ? { projectName: raw.projectName } : {}),
    ...(raw.status ? { status: raw.status } : {}),
    ...(raw.remark ? { remark: raw.remark } : {}),
  }
}

/** 报单比价单据分页(返回已归一化的记录)。 */
export async function fetchQuoteSheets(
  signal?: AbortSignal,
): Promise<QuoteSheetRecord[]> {
  const response = await apiGet(ENDPOINTS.QUOTE_SHEETS, sheetPageSchema, {
    params: { page: 0, size: 200 },
    ...(signal ? { signal } : {}),
  })
  return response.content.map(normalizeSheet)
}

/** 单据详情。 */
export async function fetchQuoteSheet(
  id: EntityId,
  signal?: AbortSignal,
): Promise<QuoteSheetRecord> {
  const response = await apiGet(ENDPOINTS.QUOTE_SHEET(id), sheetSchema, {
    ...(signal ? { signal } : {}),
  })
  return normalizeSheet(response, 0)
}

export async function createQuoteSheet(
  payload: QuoteSheetPayload,
): Promise<QuoteSheetRecord> {
  const response = await apiPost(ENDPOINTS.QUOTE_SHEETS, sheetSchema, payload)
  return normalizeSheet(response, 0)
}

export async function updateQuoteSheet(
  id: EntityId,
  payload: QuoteSheetPayload,
  expectedVersion?: string,
): Promise<QuoteSheetRecord> {
  const response = await apiPut(
    ENDPOINTS.QUOTE_SHEET(id),
    sheetSchema,
    payload,
    withConcurrencyHeaders(expectedVersion),
  )
  return normalizeSheet(response, 0)
}

export async function deleteQuoteSheet(id: EntityId): Promise<void> {
  await apiDeleteNoContent(ENDPOINTS.QUOTE_SHEET(id))
}

/** 仅保存表头字段(不传 brands/items), 携带 If-Match 版本。 */
export async function updateQuoteSheetHeader(
  id: EntityId,
  payload: QuoteSheetHeaderPayload,
  expectedVersion?: string,
): Promise<QuoteSheetRecord> {
  const response = await apiPut(
    ENDPOINTS.QUOTE_SHEET(id),
    sheetSchema,
    payload,
    withConcurrencyHeaders(expectedVersion),
  )
  return normalizeSheet(response, 0)
}

/** 行级写结果: 新行(删除时无) + 服务端权威单据版本。 */
export type QuoteSheetItemWriteResult = {
  item?: QuoteSheetItemRecord
  version?: string
}

/** 新增商品行(201), 返回新行与服务端权威单据版本。 */
export async function addQuoteSheetItem(
  id: EntityId,
  payload: QuoteSheetItemPayload,
  expectedVersion?: string,
): Promise<QuoteSheetItemWriteResult> {
  const response = await apiPostResponse(
    ENDPOINTS.QUOTE_SHEET_ITEMS(id),
    itemSchema,
    payload,
    withConcurrencyHeaders(expectedVersion),
  )
  return {
    item: normalizeItem(response.data, 'quoteSheetItem'),
    ...(readResourceVersionHeader(response.headers)
      ? { version: readResourceVersionHeader(response.headers) }
      : {}),
  }
}

/** 整行替换商品行, 返回新行与服务端权威单据版本。 */
export async function updateQuoteSheetItem(
  id: EntityId,
  itemId: EntityId,
  payload: QuoteSheetItemPayload,
  expectedVersion?: string,
): Promise<QuoteSheetItemWriteResult> {
  const response = await apiPutResponse(
    ENDPOINTS.QUOTE_SHEET_ITEM(id, itemId),
    itemSchema,
    payload,
    withConcurrencyHeaders(expectedVersion),
  )
  return {
    item: normalizeItem(response.data, 'quoteSheetItem'),
    ...(readResourceVersionHeader(response.headers)
      ? { version: readResourceVersionHeader(response.headers) }
      : {}),
  }
}

/**
 * 调整商品行顺序(子资源 item-order), 返回权威单据(含归一化后的行号)。
 * <p>提交期望顺序(十进制字符串 id); 未提交的行保持相对顺序排在末尾。
 * 行级差异保存不带位置信息, 顺序变化必须走该接口, 否则刷新会恢复原顺序。</p>
 */
export async function reorderQuoteSheetItems(
  id: EntityId,
  itemIds: EntityId[],
  expectedVersion?: string,
): Promise<QuoteSheetRecord> {
  const response = await apiPut(
    ENDPOINTS.QUOTE_SHEET_ITEM_ORDER(id),
    sheetSchema,
    { itemIds },
    withConcurrencyHeaders(expectedVersion),
  )
  return normalizeSheet(response, 0)
}

/** 删除商品行(204), 返回服务端权威单据版本。 */
export async function deleteQuoteSheetItem(
  id: EntityId,
  itemId: EntityId,
  expectedVersion?: string,
): Promise<QuoteSheetItemWriteResult> {
  const response = await apiDeleteResponse(
    ENDPOINTS.QUOTE_SHEET_ITEM(id, itemId),
    withConcurrencyHeaders(expectedVersion),
  )
  return {
    ...(readResourceVersionHeader(response.headers)
      ? { version: readResourceVersionHeader(response.headers) }
      : {}),
  }
}

/** 单格手填覆盖请求体: 现货价必填; 供应商随覆盖行一并快照。 */
export type QuoteSheetPriceCellOverridePayload = {
  spotPrice: number
  supplierId?: EntityId
  supplierName?: string
}

/**
 * 写入/更新某格的手填覆盖价(幂等 PUT)。
 *
 * <p>这是「显式覆盖」的唯一入口: 常规保存不得把价格表推导值写回覆盖行。
 * 品牌名会按路径段编码(可能含中文/特殊字符)。回包与单据读接口的价格格同形。</p>
 */
export async function saveQuoteSheetPriceOverride(
  sheetId: EntityId,
  itemId: EntityId,
  brandName: string,
  payload: QuoteSheetPriceCellOverridePayload,
): Promise<QuoteSheetPriceRecord> {
  const response = await apiPut(
    ENDPOINTS.QUOTE_SHEET_ITEM_PRICE_OVERRIDE(sheetId, itemId, brandName),
    priceSchema,
    payload,
  )
  return normalizePrice(response, 0)
}

/** 清除某格的手填覆盖(幂等 DELETE, 204); 该格回到价格表推导值。 */
export async function clearQuoteSheetPriceOverride(
  sheetId: EntityId,
  itemId: EntityId,
  brandName: string,
): Promise<void> {
  await apiDeleteNoContent(
    ENDPOINTS.QUOTE_SHEET_ITEM_PRICE_OVERRIDE(sheetId, itemId, brandName),
  )
}

/** 采购订单明细行吨位汇总: 该行订货吨数 - 报单已开吨位 = 剩余可开吨。 */
export type PurchaseOrderTonnageRecord = {
  purchaseOrderId: EntityId
  /** 采购订单明细行标识(按规格扣减的唯一标识)。 */
  purchaseOrderItemId: EntityId
  orderNo: string
  supplierName: string
  category: string
  material: string
  spec: string
  length: string
  /** 品牌(采购订单明细自带字段): 供吨位列展示"已开的品牌"与弹窗区分同规格的不同品牌。 */
  brand: string
  orderedWeight: number
  issuedWeight: number
  remainingWeight: number
  status: string
}

const purchaseOrderTonnageSchema = z.looseObject({
  purchaseOrderId: z.unknown(),
  purchaseOrderItemId: z.unknown(),
  orderNo: z.string().nullable().optional(),
  supplierName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  spec: z.string().nullable().optional(),
  length: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  orderedWeight: z.union([z.number(), z.string()]).nullable().optional(),
  issuedWeight: z.union([z.number(), z.string()]).nullable().optional(),
  remainingWeight: z.union([z.number(), z.string()]).nullable().optional(),
  status: z.string().nullable().optional(),
})

/**
 * 列出采购订单明细行(按规格)及其订货/已开/剩余吨位, 供吨位列按规格关联并展示。
 * 传 purchaseOrderItemIds 按 id 汇总(用于回显已关联行), 否则按 keyword/status/purchaseOrderId 列出选项。
 * excludeSheetId 排除当前报价单自身已保存吨位, 便于叠加本地未保存吨位。
 */
export async function fetchPurchaseOrderTonnages(
  options: {
    purchaseOrderItemIds?: EntityId[]
    keyword?: string
    status?: string
    purchaseOrderId?: EntityId
    excludeSheetId?: EntityId
  },
  signal?: AbortSignal,
): Promise<PurchaseOrderTonnageRecord[]> {
  const params: Record<string, unknown> = {}
  if (options.purchaseOrderItemIds?.length) {
    params.purchaseOrderItemIds = options.purchaseOrderItemIds
  }
  if (options.keyword) params.keyword = options.keyword
  if (options.status) params.status = options.status
  if (options.purchaseOrderId) params.purchaseOrderId = options.purchaseOrderId
  if (options.excludeSheetId) params.excludeSheetId = options.excludeSheetId
  const response = await apiGet(
    ENDPOINTS.QUOTE_SHEET_PURCHASE_ORDER_TONNAGES,
    z.array(purchaseOrderTonnageSchema),
    {
      params,
      ...(options.purchaseOrderItemIds?.length
        ? { paramsSerializer: { indexes: null } }
        : {}),
      ...(signal ? { signal } : {}),
    },
  )
  return response.map((row, index) => ({
    purchaseOrderId: parseEntityId(
      row.purchaseOrderId,
      `tonnages[${index}].purchaseOrderId`,
    ),
    purchaseOrderItemId: parseEntityId(
      row.purchaseOrderItemId,
      `tonnages[${index}].purchaseOrderItemId`,
    ),
    orderNo: asString(row.orderNo),
    supplierName: asString(row.supplierName),
    category: asString(row.category),
    material: asString(row.material),
    spec: asString(row.spec),
    length: asString(row.length),
    brand: asString(row.brand),
    orderedWeight: toOptionalNumber(row.orderedWeight) ?? 0,
    issuedWeight: toOptionalNumber(row.issuedWeight) ?? 0,
    remainingWeight: toOptionalNumber(row.remainingWeight) ?? 0,
    status: asString(row.status),
  }))
}
