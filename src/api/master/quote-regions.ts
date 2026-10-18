import { z } from 'zod'
import { parseApiContract } from '@/api/core/api-contract'
import { apiDeleteNoContent, apiGet, apiPost, apiPut } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import { STATUS } from '@/constants/status-constants'
import {
  exactPageSchema,
  strictResponseEntityIdSchema,
} from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

/**
 * 取价地区维护（`/api/v2.0/quote-regions`）。
 *
 * <p>业务背景：西本新干线按地区（城市）报价，宿主名为 `{slug}.steelx2.com`。此前
 * 「城市中文名 → 子域名 slug」只写在 `application.yml`，新增城市必须改配置并重启；
 * 现在搬到表里由业务自行维护，停用城市不必删除记录。</p>
 *
 * <p>契约要点（与后端 `V2QuoteRegionController` / `QuoteRegionService` 对齐）：</p>
 * <ul>
 *   <li>{@code id} 与分页里的实体 ID 都是十进制字符串（雪花 ID 精度约定），
 *       全程用 {@link EntityId}，禁止 `Number()`/`parseInt()`；</li>
 *   <li>分页响应字段名固定为 {@code content/totalElements/totalPages/currentPage/pageSize/hasMore}，
 *       由 {@link exactPageSchema}（`z.strictObject`）收口，写成 `page`/`size` 会直接判契约失败；</li>
 *   <li>写操作（POST/PUT/DELETE）必须带 `X-Idempotency-Key`，统一走 {@link withIdempotencyKey}；</li>
 *   <li>状态白名单只有「正常」与「禁用」（后端 {@code StatusConstants.DISABLED} 取自
 *       `DocumentStatus.DISABLED.label()`），**不是「停用」**；</li>
 *   <li>{@code slug} 会拼进主机名，只允许小写字母/数字/连字符（数据库 CHECK 约束兜底）；</li>
 *   <li>字段校验失败（空值/超长/slug 非法）与语义错误（城市名重复、slug 重复）都是 422，
 *       资源不存在是 404。</li>
 * </ul>
 */

/** 状态白名单：与后端 `StatusConstants`（正常/禁用）及数据库 CHECK 约束一致。 */
export const QUOTE_REGION_STATUSES = [STATUS.NORMAL, STATUS.DISABLED] as const

export type QuoteRegionStatus = (typeof QUOTE_REGION_STATUSES)[number]

/** 城市名称长度上限，与后端 `@Size(max = 32)` 及 varchar(32) 对齐。 */
export const QUOTE_REGION_MAX_NAME_LENGTH = 32

/** 子域名长度上限，与后端 `@Size(max = 64)` 及 varchar(64) 对齐。 */
export const QUOTE_REGION_MAX_SLUG_LENGTH = 64

/** 备注长度上限，与后端 `@Size(max = 255)` 及 varchar(255) 对齐。 */
export const QUOTE_REGION_MAX_REMARK_LENGTH = 255

/** 子域名字符集：与后端 `@Pattern` 及数据库 `ck_quote_region_slug` 一致。 */
export const QUOTE_REGION_SLUG_PATTERN = /^[a-z0-9-]+$/

/** 后端 `PageSortFieldCatalog` 里 `quote-region` 允许的排序字段白名单。 */
export const QUOTE_REGION_SORT_FIELDS = [
  'id',
  'regionName',
  'slug',
  'sortOrder',
  'status',
  'createdAt',
  'updatedAt',
] as const

/**
 * 状态宽松解析：忽略首尾空白，无法识别时返回 null。
 *
 * <p>读路径刻意宽松：后端可能先于前端新增状态，一个未知状态不该让整页 422 或整表空掉，
 * 展示层降级为原值、写路径由白名单规则拦住。</p>
 */
export function parseQuoteRegionStatus(raw: unknown): QuoteRegionStatus | null {
  if (typeof raw !== 'string') {
    return null
  }
  const normalized = raw.trim()
  return QUOTE_REGION_STATUSES.find((status) => status === normalized) ?? null
}

/** 表单/调用方传入的原始值：数字字段允许为空（antd `InputNumber` 清空后是 null）。 */
function toNumberOrNaN(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value.trim())
  }
  return Number.NaN
}

/** 写入请求的字段校验与归一化，是写路径的唯一口径。 */
export const quoteRegionInputSchema = z
  .object({
    regionName: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : ''),
      z
        .string()
        .min(1, { message: '城市名称不能为空' })
        .max(QUOTE_REGION_MAX_NAME_LENGTH, {
          message: `城市名称不能超过${QUOTE_REGION_MAX_NAME_LENGTH}个字符`,
        }),
    ),
    slug: z.preprocess(
      // slug 不许大写：归一化只做空白清理，非法字符由下面的正则拦下（后端同样不做大小写折叠，
      // 因为 slug 直接拼进主机名，静默改写会抓错站点）。
      (value) => (typeof value === 'string' ? value.trim() : ''),
      z
        .string()
        .min(1, { message: '子域名不能为空' })
        .max(QUOTE_REGION_MAX_SLUG_LENGTH, {
          message: `子域名不能超过${QUOTE_REGION_MAX_SLUG_LENGTH}个字符`,
        })
        .regex(QUOTE_REGION_SLUG_PATTERN, {
          message: '子域名只能包含小写字母、数字与连字符',
        }),
    ),
    sortOrder: z.preprocess(
      toNumberOrNaN,
      // 空值（antd InputNumber 清空是 null）与非数字都落到同一个「不能为空」：
      // 两者对用户是同一件事 —— 这里还没有一个可用的排序号。
      z
        .number({ message: '排序号不能为空' })
        .int({ message: '排序号必须为整数' })
        .min(0, { message: '排序号不能为负数' }),
    ),
    status: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : ''),
      z.enum(QUOTE_REGION_STATUSES, {
        message: '状态只能是「正常」或「禁用」',
      }),
    ),
    remark: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : ''),
      z.string().max(QUOTE_REGION_MAX_REMARK_LENGTH, {
        message: `备注不能超过${QUOTE_REGION_MAX_REMARK_LENGTH}个字符`,
      }),
    ),
  })
  .transform((payload) => ({
    regionName: payload.regionName,
    slug: payload.slug,
    sortOrder: payload.sortOrder,
    status: payload.status,
    // 备注 trim 后为空一律省略，与后端「空串存 null」一致。
    ...(payload.remark ? { remark: payload.remark } : {}),
  }))

/**
 * 表单/调用方传入的原始值。
 *
 * <p>刻意不用 `z.input<typeof quoteRegionInputSchema>`：schema 内用了 `z.preprocess`，
 * 推导出的输入类型是 `unknown` 字段，会让 antd `Form.useForm` 失去字段级类型。</p>
 */
export interface QuoteRegionInputDraft {
  /** 城市中文名，可带首尾空白。 */
  regionName: string
  /** 西本子域名前缀（如 hangzhou），可带首尾空白。 */
  slug: string
  /** 排序号；antd `InputNumber` 清空后为 null。 */
  sortOrder: number | null | undefined
  /** 状态，白名单「正常」/「禁用」。 */
  status: string
  /** 备注，可空。 */
  remark?: string | null | undefined
}

/** 校验归一化后的写入载荷。 */
export type QuoteRegionInput = z.output<typeof quoteRegionInputSchema>

/**
 * 单条记录的响应契约。
 *
 * <p>{@link strictResponseEntityIdSchema} 只接受十进制字符串：`id` 是雪花 ID，
 * 一旦把数值形式固化进契约，19 位 ID 转 `Number` 会静默丢低位，
 * 之后按错误的 id 查询/更新/删除。后端 `JacksonConfig` 已把 `Long` 序列化为字符串，
 * 因此这里不做数值兼容。</p>
 */
export const rawQuoteRegionSchema = z.looseObject({
  id: strictResponseEntityIdSchema,
  regionName: z.string(),
  slug: z.string(),
  // 读路径刻意宽松：只要求整数，不在这里复刻 @Min(0)。历史行若被直接改库写坏，
  // 也只是这一列显示异常，不该让整页列表契约失败（写路径仍由 quoteRegionInputSchema 拦住）。
  sortOrder: z.number().int(),
  status: z.string(),
  remark: z.string().nullish(),
  /*
   * 审计字段：后端 `QuoteRegionResponse` 已从 `AbstractAuditableEntity` 暴露
   * createdAt/updatedAt（全局 IsoLocalDateTimeSerializer 输出带偏移的 ISO-8601），
   * 列表「更新时间」列依赖它们，因此这里按**必填**约束。
   *
   * 历史背景：DTO 曾经不返回这两个字段，而前端 schema 已要求 `createdAt` 必填，
   * 于是每次打开页面都报「API 响应契约校验失败：GET /quote-regions」。
   * 修法是让后端补齐字段（前端契约本就反映了页面真实需要），而不是把契约放松到 nullish。
   */
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1).nullish(),
})

/** 分页响应契约（`PageResponse`）。 */
export const quoteRegionPageSchema = exactPageSchema(rawQuoteRegionSchema)

/** 取价地区记录（`id` 保持十进制字符串）。 */
export interface QuoteRegionRecord {
  id: EntityId
  regionName: string
  /** 西本子域名前缀（如 hangzhou），直接拼进主机名。 */
  slug: string
  sortOrder: number
  /** 白名单「正常」/「禁用」；未知状态原样保留，展示层降级。 */
  status: string
  remark: string | null
  /** 创建时间（后端 `QuoteRegionResponse` 暴露，ISO-8601 带时区偏移）。 */
  createdAt: string | null
  /** 更新时间；从未更新过的记录为 null，列表「更新时间」列回退显示创建时间。 */
  updatedAt: string | null
}

export interface QuoteRegionPage {
  content: QuoteRegionRecord[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasMore: boolean
}

export interface QuoteRegionListParams {
  /** 关键字，匹配 regionName/slug/remark。 */
  keyword?: string | undefined
  /** 状态过滤；非法状态后端返回 422。 */
  status?: QuoteRegionStatus | undefined
  /** 0 基页码，与后端 PageQuery 契约一致。 */
  page: number
  /** 1..200，超出后端返回 422。 */
  size: number
  sortBy?: (typeof QUOTE_REGION_SORT_FIELDS)[number] | undefined
  direction?: 'asc' | 'desc' | undefined
}

function toQuoteRegionRecord(
  raw: z.output<typeof rawQuoteRegionSchema>,
  index: number,
): QuoteRegionRecord {
  return {
    id: parseEntityId(raw.id, `quote-regions[${index}].id`),
    regionName: asString(raw.regionName),
    slug: asString(raw.slug),
    sortOrder: raw.sortOrder,
    status: asString(raw.status),
    remark: raw.remark ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  }
}

/**
 * 分页查询取价地区。
 *
 * <p>默认 `sortBy=sortOrder` + `direction=asc`：排序号语义是「展示与抓取顺序」，
 * 与运行时配置下发的城市顺序保持一致（后端 `PageQuery` 默认 DESC，因此这里显式下发升序）。</p>
 */
export async function listQuoteRegions(
  params: QuoteRegionListParams,
  signal?: AbortSignal,
): Promise<QuoteRegionPage> {
  const page = await apiGet(ENDPOINTS.QUOTE_REGIONS, quoteRegionPageSchema, {
    params: {
      page: params.page,
      size: params.size,
      sortBy: params.sortBy ?? 'sortOrder',
      direction: params.direction ?? 'asc',
      status: params.status || undefined,
      keyword: params.keyword?.trim() || undefined,
    },
    signal,
  })

  return {
    content: page.content.map(toQuoteRegionRecord),
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    currentPage: page.currentPage,
    pageSize: page.pageSize,
    hasMore: page.hasMore,
  }
}

/** 查询单条取价地区；不存在返回 404。 */
export async function getQuoteRegion(
  id: EntityId,
  signal?: AbortSignal,
): Promise<QuoteRegionRecord> {
  const raw = await apiGet(ENDPOINTS.QUOTE_REGION(id), rawQuoteRegionSchema, {
    signal,
  })
  return toQuoteRegionRecord(raw, 0)
}

/** 新增取价地区；成功返回 201 + Location。 */
export async function createQuoteRegion(
  payload: QuoteRegionInputDraft,
): Promise<QuoteRegionRecord> {
  const validated = parseApiContract(
    quoteRegionInputSchema,
    payload,
    '新增取价地区请求',
  )
  const raw = await apiPost(
    ENDPOINTS.QUOTE_REGIONS,
    rawQuoteRegionSchema,
    validated,
    withIdempotencyKey(),
  )
  return toQuoteRegionRecord(raw, 0)
}

/** 全量替换一条取价地区；成功返回 200。 */
export async function updateQuoteRegion(
  id: EntityId,
  payload: QuoteRegionInputDraft,
): Promise<QuoteRegionRecord> {
  const validated = parseApiContract(
    quoteRegionInputSchema,
    payload,
    '更新取价地区请求',
  )
  const raw = await apiPut(
    ENDPOINTS.QUOTE_REGION(id),
    rawQuoteRegionSchema,
    validated,
    withIdempotencyKey(),
  )
  return toQuoteRegionRecord(raw, 0)
}

/** 删除（软删）一条取价地区；成功返回 204。 */
export function deleteQuoteRegion(id: EntityId): Promise<void> {
  return apiDeleteNoContent(ENDPOINTS.QUOTE_REGION(id), withIdempotencyKey())
}
