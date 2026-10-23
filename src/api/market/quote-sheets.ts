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
  supplierId: z.union([z.number(), z.string()]).nullable().optional(),
  supplierName: z.string().nullable().optional(),
  /*
   * 抗震牌号代取的来源材质。**必须用 nullish**：后端未代取时显式给 `null`
   * （"查过、确认没代取"），而字段缺失是另一件事。用 `optional()` 会把 `null`
   * 归一成 `undefined`，两者就分不开了；用 `nullable().optional()` + 手动分支也一样，
   * 不如让 zod 原样保留。
   */
  spotSourceMaterial: z.string().nullish(),
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
  /** 多行关联: 一行可挂多张采购订单明细行, 每条带本次开出吨位。 */
  purchaseOrderLinks: z
    .array(
      z.looseObject({
        purchaseOrderId: z
          .union([z.number(), z.string()])
          .nullable()
          .optional(),
        purchaseOrderNo: z.string().nullable().optional(),
        purchaseOrderItemId: z
          .union([z.number(), z.string()])
          .nullable()
          .optional(),
        allocatedTon: z.union([z.number(), z.string()]).nullable().optional(),
        sortNo: z.union([z.number(), z.string()]).nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
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
  createdAt: z.string().nullable().optional(),
  /** 服务端最后落库时间(ISO 8601): 供「保存时间」展示。 */
  updatedAt: z.string().nullable().optional(),
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

export type QuoteSheetPriceRecord = {
  brandName: string
  spotPrice?: number
  supplierId?: EntityId
  supplierName?: string
  /**
   * 这个现货价是「按抗震牌号代取」时实际命中的材质（如报 HRB400、现货只有 HRB400E）。
   *
   * <p><b>`null` 与 `undefined` 语义不同，不能合并</b>：后端未代取时**显式返回 `null`**
   * （= 查过、确认没有代取）；字段缺失（`undefined`）才表示"这条响应没带这个信息"
   * （旧版本后端 / 其它写路径）。角标判据依赖这个区分（{@code null} 不显示角标，
   * 但也不能把它当成"没查过"）。</p>
   */
  spotSourceMaterial?: string | null
}

/** 行级关联的采购订单明细行: allocatedTon 是本次在该明细行开出的吨位。 */
export type QuoteSheetItemPurchaseOrderRecord = {
  purchaseOrderId: EntityId
  purchaseOrderNo?: string
  purchaseOrderItemId: EntityId
  allocatedTon: number
}

/**
 * 归一多行关联: 服务端返回列表时以列表为准; 只返回旧单值三列时合成一条, 分配吨位取本行吨位
 * (等价于"这一行全部开在这张明细行上")。订单级关联(未选明细行)不产生关联行。
 */
function normalizePurchaseOrderLinks(
  links: readonly unknown[] | null | undefined,
  purchaseOrderId: EntityId | undefined,
  purchaseOrderNo: unknown,
  purchaseOrderItemId: EntityId | undefined,
  ton: number | undefined,
  path: string,
): QuoteSheetItemPurchaseOrderRecord[] {
  const rows = (links ?? []).flatMap((raw, index) => {
    if (raw === null || typeof raw !== 'object') return []
    const link = raw as Record<string, unknown>
    const orderId = parseOptionalEntityId(
      link.purchaseOrderId,
      `${path}[${index}].purchaseOrderId`,
    )
    const itemId = parseOptionalEntityId(
      link.purchaseOrderItemId,
      `${path}[${index}].purchaseOrderItemId`,
    )
    if (!orderId || !itemId) return []
    const orderNo = asString(link.purchaseOrderNo).trim()
    return [
      {
        purchaseOrderId: orderId,
        ...(orderNo ? { purchaseOrderNo: orderNo } : {}),
        purchaseOrderItemId: itemId,
        allocatedTon: toOptionalNumber(link.allocatedTon) ?? 0,
      },
    ]
  })
  if (rows.length > 0) return rows
  if (!purchaseOrderId || !purchaseOrderItemId) return []
  const orderNo = asString(purchaseOrderNo).trim()
  return [
    {
      purchaseOrderId,
      ...(orderNo ? { purchaseOrderNo: orderNo } : {}),
      purchaseOrderItemId,
      allocatedTon: ton ?? 0,
    },
  ]
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
  /** 关联采购订单明细行标识(按规格扣减); 等于 purchaseOrderLinks[0]。 */
  purchaseOrderItemId?: EntityId
  /** 多行关联(以服务端为准; 单值三列是其第一条的镜像); 归一化后必定存在。 */
  purchaseOrderLinks?: QuoteSheetItemPurchaseOrderRecord[]
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
  /** 服务端创建时间(ISO 8601)。 */
  createdAt?: string
  /** 服务端最后落库时间(ISO 8601): 供「保存时间」展示。 */
  updatedAt?: string
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
  /** 多行关联: 整组替换; 不带时服务端按单值三列合成一条。 */
  purchaseOrderLinks?: {
    purchaseOrderId: EntityId
    purchaseOrderItemId: EntityId
    allocatedTon?: number
  }[]
  prices: {
    brandName: string
    spotPrice?: number
    supplierId?: EntityId
    /**
     * 现货价「按抗震牌号代取」的来源材质（**写入口径**）。
     *
     * <p><b>注意请求与响应的字段名不同</b>：写请求叫 `sourceMaterial`
     * （后端 `QuoteSheetRequest.ItemPriceRequest`），响应才是 `spotSourceMaterial`
     * （`QuoteSheetResponse`）。按响应名去写会被 Jackson 当未知字段静默忽略 ——
     * 实测后果：价格存进去了、来源丢了，刷新后角标消失。</p>
     *
     * <p>`null` 是有效载荷：表示"曾经代取、已被手工覆盖"，用于让服务端清空来源；
     * 省略该字段表示这一格从未涉及代取（服务端保持原值）。</p>
     */
    sourceMaterial?: string | null
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
  return {
    brandName: raw.brandName,
    ...(toOptionalNumber(raw.spotPrice) !== undefined
      ? { spotPrice: toOptionalNumber(raw.spotPrice) }
      : {}),
    ...(parseOptionalEntityId(raw.supplierId, `prices[${index}].supplierId`)
      ? {
          supplierId: parseOptionalEntityId(
            raw.supplierId,
            `prices[${index}].supplierId`,
          ),
        }
      : {}),
    ...(raw.supplierName ? { supplierName: raw.supplierName } : {}),
    /*
     * 三态原样透传：有值 → 字符串；后端明确未代取 → `null`；字段缺失 → 不写这个 key
     * （= `undefined`）。这里刻意不用 `raw.spotSourceMaterial || undefined` 之类的归一，
     * 否则 `null` 会被抹成 `undefined`，"查过确认没代取"就退化成"不知道"。
     */
    ...(raw.spotSourceMaterial !== undefined
      ? { spotSourceMaterial: raw.spotSourceMaterial }
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
    purchaseOrderLinks: normalizePurchaseOrderLinks(
      item.purchaseOrderLinks,
      purchaseOrderId,
      item.purchaseOrderNo,
      purchaseOrderItemId,
      toOptionalNumber(item.ton),
      `${path}.purchaseOrderLinks`,
    ),
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
    ...(raw.createdAt ? { createdAt: raw.createdAt } : {}),
    ...(raw.updatedAt ? { updatedAt: raw.updatedAt } : {}),
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

/**
 * 采购订单明细行吨位汇总。
 *
 * <p><b>两个"已开"是不同的量, 不可互相替代</b>: `issuedWeight` 是**其他报价单的报单占用**
 * (报单需求量之和), 用于选单判断"这条订单行的额度还能不能再报"; `actualWeightTon` 是
 * **真实已开货**(入库审核回写), 用于吨位列回答"这条明细行已经开出去多少货"。</p>
 */
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
  /** 其他报价单在该明细行上的报单占用(选单额度口径)。 */
  issuedWeight: number
  /** 剩余可开 = 订货吨位 − 报单占用。 */
  remainingWeight: number
  /** 真实已开货吨位(入库回写); null = 还没有任何到货记录(区别于"开了 0 吨")。 */
  actualWeightTon: number | null
  /** 人工裁定的「已开完」标记: 与吨位无关, 不根据 actualWeightTon 自动判定。 */
  issuedDone: boolean
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
  actualWeightTon: z.union([z.number(), z.string()]).nullable().optional(),
  issuedDone: z.boolean().nullable().optional(),
  status: z.string().nullable().optional(),
})

/**
 * 列出采购订单明细行(按规格)及其订货/报单占用/剩余吨位与真实已开货, 供吨位列按规格关联并展示。
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
    // 保持 null 语义: "还没有到货记录"与"开了 0 吨"在展示与判断上不等价
    actualWeightTon: toOptionalNumber(row.actualWeightTon) ?? null,
    issuedDone: Boolean(row.issuedDone),
    status: asString(row.status),
  }))
}
