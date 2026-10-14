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
 * 定尺加价维护（`/api/v2.0/length-premiums`）。
 *
 * <p>业务背景：行情匹配时按定尺对基准价加价（「12 米 +30 元/吨」）。此前规则同时写在
 * `application.yml` 的 `leo.market.steel-quote.match.length-premiums` 与 Java 默认值里，
 * 属同一口径的重复定义，调整加价必须改代码重启；现在由业务自行维护。</p>
 *
 * <p>契约要点（与后端 `V2LengthPremiumController` / `LengthPremiumService` 对齐）：</p>
 * <ul>
 *   <li>{@code id} 与分页里的实体 ID 都是十进制字符串（雪花 ID 精度约定），
 *       全程用 {@link EntityId}，禁止 `Number()`/`parseInt()`；</li>
 *   <li>分页响应字段名固定为 {@code content/totalElements/totalPages/currentPage/pageSize/hasMore}，
 *       由 {@link exactPageSchema}（`z.strictObject`）收口，写成 `page`/`size` 会直接判契约失败；</li>
 *   <li>写操作（POST/PUT/DELETE）必须带 `X-Idempotency-Key`，统一走 {@link withIdempotencyKey}；</li>
 *   <li>{@code premium} 是**整数且允许为负**（负值表示优惠），区间 -100000..100000，
 *       后端只做区间限制而不做非负校验；</li>
 *   <li>状态白名单只有「正常」与「禁用」（后端 {@code StatusConstants.DISABLED} 取自
 *       `DocumentStatus.DISABLED.label()`），**不是「停用」**；</li>
 *   <li>字段校验失败（空值/超长/超区间）与语义错误（定尺名称重复）都是 422，
 *       资源不存在是 404。</li>
 * </ul>
 */

/** 状态白名单：与后端 `StatusConstants`（正常/禁用）及数据库 CHECK 约束一致。 */
export const LENGTH_PREMIUM_STATUSES = [STATUS.NORMAL, STATUS.DISABLED] as const

export type LengthPremiumStatus = (typeof LENGTH_PREMIUM_STATUSES)[number]

/** 定尺名称长度上限，与后端 `@Size(max = 32)` 及 varchar(32) 对齐。 */
export const LENGTH_PREMIUM_MAX_NAME_LENGTH = 32

/** 加价下限，与后端 `@Min(-100000)` 对齐（负值表示优惠）。 */
export const LENGTH_PREMIUM_MIN = -100000

/** 加价上限，与后端 `@Max(100000)` 对齐。 */
export const LENGTH_PREMIUM_MAX = 100000

/** 备注长度上限，与后端 `@Size(max = 255)` 及 varchar(255) 对齐。 */
export const LENGTH_PREMIUM_MAX_REMARK_LENGTH = 255

/** 后端 `PageSortFieldCatalog` 里 `length-premium` 允许的排序字段白名单。 */
export const LENGTH_PREMIUM_SORT_FIELDS = [
  'id',
  'lengthName',
  'premium',
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
export function parseLengthPremiumStatus(
  raw: unknown,
): LengthPremiumStatus | null {
  if (typeof raw !== 'string') {
    return null
  }
  const normalized = raw.trim()
  return LENGTH_PREMIUM_STATUSES.find((status) => status === normalized) ?? null
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
export const lengthPremiumInputSchema = z
  .object({
    lengthName: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : ''),
      z
        .string()
        .min(1, { message: '定尺名称不能为空' })
        .max(LENGTH_PREMIUM_MAX_NAME_LENGTH, {
          message: `定尺名称不能超过${LENGTH_PREMIUM_MAX_NAME_LENGTH}个字符`,
        }),
    ),
    premium: z.preprocess(
      toNumberOrNaN,
      // 空值（antd InputNumber 清空是 null）与非数字都落到同一个「不能为空」；
      // 负值刻意不做非负校验 —— 优惠是合法业务值，只受区间约束。
      z
        .number({ message: '加价不能为空' })
        .int({ message: '加价必须为整数' })
        .min(LENGTH_PREMIUM_MIN, {
          message: `加价不能小于 ${LENGTH_PREMIUM_MIN}`,
        })
        .max(LENGTH_PREMIUM_MAX, {
          message: `加价不能大于 ${LENGTH_PREMIUM_MAX}`,
        }),
    ),
    sortOrder: z.preprocess(
      toNumberOrNaN,
      z
        .number({ message: '排序号不能为空' })
        .int({ message: '排序号必须为整数' })
        .min(0, { message: '排序号不能为负数' }),
    ),
    status: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : ''),
      z.enum(LENGTH_PREMIUM_STATUSES, {
        message: '状态只能是「正常」或「禁用」',
      }),
    ),
    remark: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : ''),
      z.string().max(LENGTH_PREMIUM_MAX_REMARK_LENGTH, {
        message: `备注不能超过${LENGTH_PREMIUM_MAX_REMARK_LENGTH}个字符`,
      }),
    ),
  })
  .transform((payload) => ({
    lengthName: payload.lengthName,
    premium: payload.premium,
    sortOrder: payload.sortOrder,
    status: payload.status,
    // 备注 trim 后为空一律省略，与后端「空串存 null」一致。
    ...(payload.remark ? { remark: payload.remark } : {}),
  }))

/**
 * 表单/调用方传入的原始值。
 *
 * <p>刻意不用 `z.input<typeof lengthPremiumInputSchema>`：schema 内用了 `z.preprocess`，
 * 推导出的输入类型是 `unknown` 字段，会让 antd `Form.useForm` 失去字段级类型。</p>
 */
export interface LengthPremiumInputDraft {
  /** 定尺名称（如 12米），可带首尾空白。 */
  lengthName: string
  /** 每吨加价（元），允许为负表示优惠；antd `InputNumber` 清空后为 null。 */
  premium: number | null | undefined
  /** 排序号；antd `InputNumber` 清空后为 null。 */
  sortOrder: number | null | undefined
  /** 状态，白名单「正常」/「禁用」。 */
  status: string
  /** 备注，可空。 */
  remark?: string | null | undefined
}

/** 校验归一化后的写入载荷。 */
export type LengthPremiumInput = z.output<typeof lengthPremiumInputSchema>

/**
 * 响应侧的整数字段：Jackson 把 `Integer` 序列化为 JSON number，
 * 这里额外兼容十进制字符串（历史/代理层改写），统一归一为 number。
 *
 * <p>与 `shared/schemas/api.ts` 的 `responseNonNegativeIntegerSchema` 同源，但加价允许为负，
 * 因此不复用那个只接受非负值的 schema。</p>
 */
const responseSignedIntegerSchema = z.union([
  z.number().int().safe(),
  z
    .string()
    .trim()
    .regex(/^-?\d+$/)
    .transform(Number)
    .pipe(z.number().int().safe()),
])

/**
 * 单条记录的响应契约。
 *
 * <p>{@link strictResponseEntityIdSchema} 只接受十进制字符串：`id` 是雪花 ID，
 * 一旦把数值形式固化进契约，19 位 ID 转 `Number` 会静默丢低位，
 * 之后按错误的 id 查询/更新/删除。后端 `JacksonConfig` 已把 `Long` 序列化为字符串，
 * 因此这里不做数值兼容。</p>
 */
export const rawLengthPremiumSchema = z.looseObject({
  id: strictResponseEntityIdSchema,
  lengthName: z.string(),
  // 读路径不做区间校验：历史行即使超区间也只该显示异常，不该让整页列表契约失败
  // （写路径仍由 lengthPremiumInputSchema 拦住 -100000..100000）。
  premium: responseSignedIntegerSchema,
  sortOrder: responseSignedIntegerSchema,
  status: z.string(),
  remark: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
})

/** 分页响应契约（`PageResponse`）。 */
export const lengthPremiumPageSchema = exactPageSchema(rawLengthPremiumSchema)

/** 定尺加价记录（`id` 保持十进制字符串）。 */
export interface LengthPremiumRecord {
  id: EntityId
  lengthName: string
  /** 每吨加价（元），负值表示优惠。 */
  premium: number
  sortOrder: number
  /** 白名单「正常」/「禁用」；未知状态原样保留，展示层降级。 */
  status: string
  remark: string | null
  createdAt: string
  updatedAt: string | null
}

export interface LengthPremiumPage {
  content: LengthPremiumRecord[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasMore: boolean
}

export interface LengthPremiumListParams {
  /** 关键字，匹配 lengthName/remark。 */
  keyword?: string | undefined
  /** 状态过滤；非法状态后端返回 422。 */
  status?: LengthPremiumStatus | undefined
  /** 0 基页码，与后端 PageQuery 契约一致。 */
  page: number
  /** 1..200，超出后端返回 422。 */
  size: number
  sortBy?: (typeof LENGTH_PREMIUM_SORT_FIELDS)[number] | undefined
  direction?: 'asc' | 'desc' | undefined
}

function toLengthPremiumRecord(
  raw: z.output<typeof rawLengthPremiumSchema>,
  index: number,
): LengthPremiumRecord {
  return {
    id: parseEntityId(raw.id, `length-premiums[${index}].id`),
    lengthName: asString(raw.lengthName),
    premium: raw.premium,
    sortOrder: raw.sortOrder,
    status: asString(raw.status),
    remark: raw.remark ?? null,
    createdAt: asString(raw.createdAt),
    updatedAt: raw.updatedAt ?? null,
  }
}

/**
 * 分页查询定尺加价。
 *
 * <p>默认 `sortBy=sortOrder` + `direction=asc`：排序号语义是「展示与匹配顺序」，
 * 与行情匹配取值顺序保持一致（后端 `PageQuery` 默认 DESC，因此这里显式下发升序）。</p>
 */
export async function listLengthPremiums(
  params: LengthPremiumListParams,
  signal?: AbortSignal,
): Promise<LengthPremiumPage> {
  const page = await apiGet(
    ENDPOINTS.LENGTH_PREMIUMS,
    lengthPremiumPageSchema,
    {
      params: {
        page: params.page,
        size: params.size,
        sortBy: params.sortBy ?? 'sortOrder',
        direction: params.direction ?? 'asc',
        status: params.status || undefined,
        keyword: params.keyword?.trim() || undefined,
      },
      signal,
    },
  )

  return {
    content: page.content.map(toLengthPremiumRecord),
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    currentPage: page.currentPage,
    pageSize: page.pageSize,
    hasMore: page.hasMore,
  }
}

/** 查询单条定尺加价；不存在返回 404。 */
export async function getLengthPremium(
  id: EntityId,
  signal?: AbortSignal,
): Promise<LengthPremiumRecord> {
  const raw = await apiGet(
    ENDPOINTS.LENGTH_PREMIUM(id),
    rawLengthPremiumSchema,
    { signal },
  )
  return toLengthPremiumRecord(raw, 0)
}

/** 新增定尺加价；成功返回 201 + Location。 */
export async function createLengthPremium(
  payload: LengthPremiumInputDraft,
): Promise<LengthPremiumRecord> {
  const validated = parseApiContract(
    lengthPremiumInputSchema,
    payload,
    '新增定尺加价请求',
  )
  const raw = await apiPost(
    ENDPOINTS.LENGTH_PREMIUMS,
    rawLengthPremiumSchema,
    validated,
    withIdempotencyKey(),
  )
  return toLengthPremiumRecord(raw, 0)
}

/** 全量替换一条定尺加价；成功返回 200。 */
export async function updateLengthPremium(
  id: EntityId,
  payload: LengthPremiumInputDraft,
): Promise<LengthPremiumRecord> {
  const validated = parseApiContract(
    lengthPremiumInputSchema,
    payload,
    '更新定尺加价请求',
  )
  const raw = await apiPut(
    ENDPOINTS.LENGTH_PREMIUM(id),
    rawLengthPremiumSchema,
    validated,
    withIdempotencyKey(),
  )
  return toLengthPremiumRecord(raw, 0)
}

/** 删除（软删）一条定尺加价；成功返回 204。 */
export function deleteLengthPremium(id: EntityId): Promise<void> {
  return apiDeleteNoContent(ENDPOINTS.LENGTH_PREMIUM(id), withIdempotencyKey())
}
