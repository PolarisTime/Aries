import { z } from 'zod'
import { parseApiContract } from '@/api/core/api-contract'
import { apiDeleteNoContent, apiGet, apiPost, apiPut } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  exactPageSchema,
  strictResponseEntityIdSchema,
} from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

/**
 * 值映射/别名维护（`/api/v2.0/value-aliases`）。
 *
 * <p>业务背景：把「同一含义多种写法」归一为统一写法（品牌「万泰」→「浙江万泰」、
 * 类别「直条」→「螺纹钢」），此前规则只能改代码，现在由业务人员自行维护。</p>
 *
 * <p>契约要点（与后端 `V2ValueAliasController` / `ValueAliasService` 对齐）：</p>
 * <ul>
 *   <li>{@code id} 与分页里的实体 ID 都是十进制字符串（雪花 ID 精度约定），
 *       全程用 {@link EntityId}，禁止 `Number()`/`parseInt()`；</li>
 *   <li>写操作（POST/PUT/DELETE）必须带 `X-Idempotency-Key`，统一走
 *       {@link withIdempotencyKey}；</li>
 *   <li>维度白名单固定四类、大小写不敏感、存库为大写；非法维度后端返回 422（code 4220）；</li>
 *   <li>字段校验失败（空值/超长）与语义错误（自映射、同维度源写法重复）都是 422，
 *       不存在是 404。</li>
 * </ul>
 */

/** 维度白名单：与后端 `ValueAliasDimension` 及数据库 CHECK 约束一致。 */
export const VALUE_ALIAS_DIMENSIONS = [
  'CATEGORY',
  'MATERIAL',
  'LENGTH',
  'BRAND',
] as const

export type ValueAliasDimension = (typeof VALUE_ALIAS_DIMENSIONS)[number]

/** 源写法/目标写法长度上限，与后端 `ValueAliasService.MAX_VALUE_LENGTH` 及 varchar(64) 对齐。 */
export const VALUE_ALIAS_MAX_VALUE_LENGTH = 64

/** 备注长度上限，与后端 `@Size(max = 255)` 及 varchar(255) 对齐。 */
export const VALUE_ALIAS_MAX_REMARK_LENGTH = 255

/** 后端 `PageSortFieldCatalog` 里 `value-alias` 允许的排序字段白名单。 */
export const VALUE_ALIAS_SORT_FIELDS = [
  'id',
  'dimension',
  'sourceValue',
  'targetValue',
  'createdAt',
  'updatedAt',
] as const

/**
 * 维度宽松解析：忽略大小写与首尾空白，无法识别时返回 null。
 *
 * <p>读路径刻意宽松：后端可能先于前端新增维度，一个未知维度不该让整页 422 或整表空掉。</p>
 */
export function parseValueAliasDimension(
  raw: unknown,
): ValueAliasDimension | null {
  if (typeof raw !== 'string') {
    return null
  }
  const normalized = raw.trim().toUpperCase()
  return (
    VALUE_ALIAS_DIMENSIONS.find((dimension) => dimension === normalized) ?? null
  )
}

/** 写入请求的字段校验（空值/超长/自映射）与归一化，是写路径的唯一口径。 */
export const valueAliasInputSchema = z
  .object({
    dimension: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim().toUpperCase() : ''),
      z.enum(VALUE_ALIAS_DIMENSIONS, {
        message: '维度必须是 CATEGORY / MATERIAL / LENGTH / BRAND 之一',
      }),
    ),
    sourceValue: z.preprocess(
      (value) => (typeof value === 'string' ? value : ''),
      z
        .string()
        .trim()
        .min(1, { message: '源写法不能为空' })
        .max(VALUE_ALIAS_MAX_VALUE_LENGTH, {
          message: `源写法不能超过${VALUE_ALIAS_MAX_VALUE_LENGTH}个字符`,
        }),
    ),
    targetValue: z.preprocess(
      (value) => (typeof value === 'string' ? value : ''),
      z
        .string()
        .trim()
        .min(1, { message: '目标写法不能为空' })
        .max(VALUE_ALIAS_MAX_VALUE_LENGTH, {
          message: `目标写法不能超过${VALUE_ALIAS_MAX_VALUE_LENGTH}个字符`,
        }),
    ),
    remark: z.preprocess(
      (value) => (typeof value === 'string' ? value : ''),
      z
        .string()
        .trim()
        .max(VALUE_ALIAS_MAX_REMARK_LENGTH, {
          message: `备注不能超过${VALUE_ALIAS_MAX_REMARK_LENGTH}个字符`,
        }),
    ),
  })
  .superRefine((payload, context) => {
    if (payload.sourceValue === payload.targetValue) {
      context.addIssue({
        code: 'custom',
        path: ['targetValue'],
        message: '源写法与目标写法相同，自映射没有意义',
      })
    }
  })
  .transform((payload) => ({
    dimension: payload.dimension,
    sourceValue: payload.sourceValue,
    targetValue: payload.targetValue,
    // 备注 trim 后为空一律省略，与后端「空串存 null」一致。
    ...(payload.remark ? { remark: payload.remark } : {}),
  }))

/**
 * 表单/调用方传入的原始值。
 *
 * <p>刻意不用 `z.input<typeof valueAliasInputSchema>`：schema 内用了 `z.preprocess`，
 * 推导出的输入类型是 `unknown` 字段，会让 antd `Form.useForm` 失去字段级类型。</p>
 */
export interface ValueAliasInputDraft {
  /** 维度，大小写不敏感，可带首尾空白。 */
  dimension: string
  sourceValue: string
  targetValue: string
  /** 备注，可空。 */
  remark?: string | null | undefined
}

/** 校验归一化后的写入载荷。 */
export type ValueAliasInput = z.output<typeof valueAliasInputSchema>

/**
 * 单条记录的响应契约。
 *
 * <p>{@link strictResponseEntityIdSchema} 只接受十进制字符串：`id` 是雪花 ID，
 * 一旦把数值形式固化进契约，19 位 ID 转 `Number` 会静默丢低位，
 * 之后按错误的 id 查询/更新/删除。后端 `JacksonConfig` 已把 `Long` 序列化为字符串，
 * 因此这里不做数值兼容。</p>
 */
export const rawValueAliasSchema = z.looseObject({
  id: strictResponseEntityIdSchema,
  dimension: z.string(),
  sourceValue: z.string(),
  targetValue: z.string(),
  remark: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
})

/** 分页响应契约（`PageResponse`）。 */
export const valueAliasPageSchema = exactPageSchema(rawValueAliasSchema)

/** 值映射记录（`id` 保持十进制字符串）。 */
export interface ValueAliasRecord {
  id: EntityId
  /** 存库为大写；未知维度原样保留，展示层降级。 */
  dimension: string
  sourceValue: string
  targetValue: string
  remark: string | null
  createdAt: string
  updatedAt: string | null
}

export interface ValueAliasPage {
  content: ValueAliasRecord[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasMore: boolean
}

export interface ValueAliasListParams {
  /** 维度过滤，大小写不敏感；非法维度后端返回 422。 */
  dimension?: ValueAliasDimension | undefined
  /** 关键字，匹配 sourceValue/targetValue/remark。 */
  keyword?: string | undefined
  /** 0 基页码，与后端 PageQuery 契约一致。 */
  page: number
  /** 1..200，超出后端返回 422。 */
  size: number
  sortBy?: (typeof VALUE_ALIAS_SORT_FIELDS)[number] | undefined
  direction?: 'asc' | 'desc' | undefined
}

function toValueAliasRecord(
  raw: z.output<typeof rawValueAliasSchema>,
  index: number,
): ValueAliasRecord {
  return {
    id: parseEntityId(raw.id, `value-aliases[${index}].id`),
    dimension: asString(raw.dimension).trim().toUpperCase(),
    sourceValue: asString(raw.sourceValue),
    targetValue: asString(raw.targetValue),
    remark: raw.remark ?? null,
    createdAt: asString(raw.createdAt),
    updatedAt: raw.updatedAt ?? null,
  }
}

/** 分页查询值映射。 */
export async function listValueAliases(
  params: ValueAliasListParams,
  signal?: AbortSignal,
): Promise<ValueAliasPage> {
  const page = await apiGet(ENDPOINTS.VALUE_ALIASES, valueAliasPageSchema, {
    params: {
      page: params.page,
      size: params.size,
      sortBy: params.sortBy ?? 'id',
      direction: params.direction ?? 'desc',
      dimension: params.dimension || undefined,
      keyword: params.keyword?.trim() || undefined,
    },
    signal,
  })

  return {
    content: page.content.map(toValueAliasRecord),
    totalElements: page.totalElements,
    totalPages: page.totalPages,
    currentPage: page.currentPage,
    pageSize: page.pageSize,
    hasMore: page.hasMore,
  }
}

/** 查询单条值映射；不存在返回 404。 */
export async function getValueAlias(
  id: EntityId,
  signal?: AbortSignal,
): Promise<ValueAliasRecord> {
  const raw = await apiGet(ENDPOINTS.VALUE_ALIAS(id), rawValueAliasSchema, {
    signal,
  })
  return toValueAliasRecord(raw, 0)
}

/** 新增值映射；成功返回 201 + Location。 */
export async function createValueAlias(
  payload: ValueAliasInputDraft,
): Promise<ValueAliasRecord> {
  const validated = parseApiContract(
    valueAliasInputSchema,
    payload,
    '新增值映射请求',
  )
  const raw = await apiPost(
    ENDPOINTS.VALUE_ALIASES,
    rawValueAliasSchema,
    validated,
    withIdempotencyKey(),
  )
  return toValueAliasRecord(raw, 0)
}

/** 全量替换一条值映射；成功返回 200。 */
export async function updateValueAlias(
  id: EntityId,
  payload: ValueAliasInputDraft,
): Promise<ValueAliasRecord> {
  const validated = parseApiContract(
    valueAliasInputSchema,
    payload,
    '更新值映射请求',
  )
  const raw = await apiPut(
    ENDPOINTS.VALUE_ALIAS(id),
    rawValueAliasSchema,
    validated,
    withIdempotencyKey(),
  )
  return toValueAliasRecord(raw, 0)
}

/** 删除（软删）一条值映射；成功返回 204。 */
export function deleteValueAlias(id: EntityId): Promise<void> {
  return apiDeleteNoContent(ENDPOINTS.VALUE_ALIAS(id), withIdempotencyKey())
}
