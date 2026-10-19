import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { exactPageSchema } from '@/shared/schemas/api'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

export type ProjectOption = {
  id: EntityId
  value: EntityId
  label: string
  customerId: EntityId
  customerCode?: string
  projectCode: string
  projectName: string
  projectNameAbbr?: string
  settlementCompanyId?: EntityId
  settlementCompanyName?: string
  /** 网价浮动方向: ADD加价/SUBTRACT减价; 空表示不浮动。 */
  priceFloatMode?: ProjectPriceFloatMode
  /** 网价固定浮动幅度(元/吨)。 */
  priceFloatValue?: number
  /** 项目上次交付核定使用的价格规定ID(用于默认选中)。 */
  lastPriceRuleId?: EntityId
  /** 默认取价数据源: MYSTEEL/STEELX。 */
  quoteSource?: ProjectQuoteSource
  /** 默认取价地区(西本城市中文名)。 */
  quoteRegion?: string
  /** 项目允许的品牌; 空数组表示不限制。 */
  allowedBrands: string[]
  /** 项目允许的材质; 空数组表示不限制。 */
  allowedMaterials: string[]
  /** 允许品牌不匹配时的处理方式; 清单为空或未配置时缺省, 由调用方按 WARN 处理。 */
  allowedBrandSeverity?: ProjectScopeEnforcement
  /** 允许材质不匹配时的处理方式; 清单为空或未配置时缺省, 由调用方按 WARN 处理。 */
  allowedMaterialSeverity?: ProjectScopeEnforcement
}

/**
 * 项目采购范围的处理方式(力度可配)。
 * <p>
 * OFF 保留清单但关闭校验, WARN 只提醒, BLOCK 阻断保存 —— 同一份规则换力度不改代码。
 */
export type ProjectScopeEnforcement = 'OFF' | 'WARN' | 'BLOCK'

/** 处理方式选项的默认档: 清单非空但后端没给力度时按「提醒」处理, 与后端读路径口径一致。 */
export const DEFAULT_SCOPE_ENFORCEMENT: ProjectScopeEnforcement = 'WARN'

/**
 * 项目取价基准日期口径。
 * <p>
 * DELIVERY 按送货日期取价; ORDER 按报单日期加 N 个交易日取价; MANUAL 每次交付核定手工选择。
 */
export type ProjectPriceDateBasis = 'DELIVERY' | 'ORDER' | 'MANUAL'

/** 取价基准日期默认档: 与后端默认一致, 缺省按「送货日期」取价。 */
export const DEFAULT_PRICE_DATE_BASIS: ProjectPriceDateBasis = 'DELIVERY'

/** 报单日期基准可顺延的交易日数上限; 与后端 0..30 的校验区间一致。 */
export const MAX_PRICE_DATE_OFFSET_DAYS = 30

/**
 * 项目取价时段策略。
 * <p>
 * AUTO 自动取当日最新时段; FIXED 固定取 {@link ProjectPricePeriod} 指定时段; MANUAL 每次手工选择。
 */
export type ProjectPricePeriodPolicy = 'AUTO' | 'FIXED' | 'MANUAL'

/** 取价时段策略默认档: 与后端默认一致, 缺省自动取当日最新时段。 */
export const DEFAULT_PRICE_PERIOD_POLICY: ProjectPricePeriodPolicy = 'AUTO'

/**
 * 固定取价时段的可选值。
 * <p>
 * 中文文案本身就是落库枚举值(与后端一致), 因此这里不做翻译, 展示层另按 key 取文案。
 */
export const PRICE_PERIOD_OPTIONS = ['上午', '中午', '下午'] as const

export type ProjectPricePeriod = (typeof PRICE_PERIOD_OPTIONS)[number]

/** 取价数据源。 */
export type ProjectQuoteSource = 'MYSTEEL' | 'STEELX'

export type ProjectPriceFloatMode = 'ADD' | 'SUBTRACT'

export type ProjectAbbreviationOption = {
  value: EntityId
  label: string
  title: string
}

type RawProjectOption = {
  id?: unknown
  value?: unknown
  label?: unknown
  customerId?: unknown
  customerCode?: unknown
  projectCode?: unknown
  projectName?: unknown
  projectNameAbbr?: unknown
  settlementCompanyId?: unknown
  settlementCompanyName?: unknown
  priceFloatMode?: unknown
  priceFloatValue?: unknown
  lastPriceRuleId?: unknown
  quoteSource?: unknown
  quoteRegion?: unknown
  allowedBrands?: unknown
  allowedMaterials?: unknown
  allowedBrandSeverity?: unknown
  allowedMaterialSeverity?: unknown
}

type RawProjectPageRow = {
  id: unknown
  projectName: unknown
  projectNameAbbr?: unknown
  allowedBrands?: unknown
}

const projectOptionsResponseSchema = z.array(
  z.object({
    id: z.string(),
    value: z.string(),
    label: z.string(),
    customerId: z.string(),
    customerCode: z.string(),
    projectCode: z.string(),
    projectName: z.string(),
    projectNameAbbr: z.string().nullable().optional(),
    settlementCompanyId: z.string().nullable().optional(),
    settlementCompanyName: z.string().nullable().optional(),
    priceFloatMode: z.string().nullable().optional(),
    priceFloatValue: z.union([z.string(), z.number()]).nullable().optional(),
    lastPriceRuleId: z.union([z.string(), z.number()]).nullable().optional(),
    quoteSource: z.string().nullable().optional(),
    quoteRegion: z.string().nullable().optional(),
    allowedBrands: z.array(z.string()).nullable().optional(),
    allowedMaterials: z.array(z.string()).nullable().optional(),
    allowedBrandSeverity: z.string().nullable().optional(),
    allowedMaterialSeverity: z.string().nullable().optional(),
  }),
)

const projectPageResponseSchema = exactPageSchema(
  z.looseObject({
    id: z.string(),
    projectName: z.string(),
    projectNameAbbr: z.string().nullable().optional(),
    // 比价页需要知道「这个项目允许哪些品牌」——项目资料是品牌范围的唯一配置入口，
    // 比价页只读它，不再维护一份独立清单（见 ProjectConfigModal 的 candidateBrands）。
    allowedBrands: z.array(z.string()).nullable().optional(),
  }),
)

export function toProjectAbbreviationOptions(
  rows: RawProjectPageRow[],
): ProjectAbbreviationOption[] {
  return rows.map((row, index) => {
    const value = parseEntityId(row.id, `projects[${index}].id`)
    const projectName = asString(row.projectName).trim()
    const projectNameAbbr = asString(row.projectNameAbbr).trim()
    const label = projectNameAbbr || projectName || `#${value}`

    return {
      value,
      label,
      title: projectName || label,
    }
  })
}

/** 允许品牌/材质列表归一化: 只保留去重后的非空字符串, 非数组统一按未配置处理。 */
function normalizeAllowedSpec(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const entry of value) {
    const text = asString(entry).trim()
    if (text && !seen.has(text)) {
      seen.add(text)
      normalized.push(text)
    }
  }
  return normalized
}

/**
 * 处理方式归一化: 只认三个字面量(大小写不敏感), 其余(含 null/未知值)按默认「提醒」处理。
 * <p>
 * 读路径刻意宽松: 后端已经用 CHECK 约束与写路径校验挡住脏数据, 客户端再严格一次只会
 * 因为一个字段漂移就让整个项目下拉不可用。
 */
export function normalizeScopeEnforcement(
  value: unknown,
): ProjectScopeEnforcement {
  const text = asString(value).trim().toUpperCase()
  return text === 'OFF' || text === 'WARN' || text === 'BLOCK'
    ? text
    : DEFAULT_SCOPE_ENFORCEMENT
}

/**
 * 取价基准归一化: 只认三个字面量(大小写不敏感), 其余(含 null/未知值)按默认「送货日期」处理。
 * <p>
 * 与 {@link normalizeScopeEnforcement} 同一口径: 读路径宽松, 一个字段漂移不该让整条记录不可用。
 */
export function normalizePriceDateBasis(value: unknown): ProjectPriceDateBasis {
  const text = asString(value).trim().toUpperCase()
  return text === 'DELIVERY' || text === 'ORDER' || text === 'MANUAL'
    ? text
    : DEFAULT_PRICE_DATE_BASIS
}

/**
 * 报单日期顺延交易日数归一化: 取整后夹到 0..{@link MAX_PRICE_DATE_OFFSET_DAYS}。
 * <p>
 * 非法值(含 null/布尔/非数字字符串)一律回落到 0, 避免把 NaN 或越界值下发到后端。
 */
export function normalizePriceDateOffsetDays(value: unknown): number {
  const text = typeof value === 'string' ? value.trim() : value
  if (typeof text !== 'number' && typeof text !== 'string') {
    return 0
  }
  const parsed = Number(text)
  if (!Number.isFinite(parsed)) {
    return 0
  }
  return Math.min(Math.max(Math.trunc(parsed), 0), MAX_PRICE_DATE_OFFSET_DAYS)
}

/**
 * 休市取前一交易日归一化: 只认布尔真值。
 * <p>
 * 刻意不用 truthy 判断: 后端若把 false 序列化成字符串 'false', 宽松转换会把它读成 true。
 */
export function normalizePriceClosedDayPrevSettle(value: unknown): boolean {
  return value === true
}

/** 取价时段策略归一化: 只认三个字面量(大小写不敏感), 其余(含 null/未知值)按默认「自动」处理。 */
export function normalizePricePeriodPolicy(
  value: unknown,
): ProjectPricePeriodPolicy {
  const text = asString(value).trim().toUpperCase()
  return text === 'AUTO' || text === 'FIXED' || text === 'MANUAL'
    ? text
    : DEFAULT_PRICE_PERIOD_POLICY
}

/** 固定取价时段归一化: 只认「上午/中午/下午」, 其余(含 null/未知值)按未选择(null)处理。 */
export function normalizePricePeriodFixed(
  value: unknown,
): ProjectPricePeriod | null {
  const text = asString(value).trim()
  return PRICE_PERIOD_OPTIONS.some((period) => period === text)
    ? (text as ProjectPricePeriod)
    : null
}

/** 清单为空(不限制)时力度无意义: 此时不下发力度, 避免调用方误判「配置了限制」。 */
function resolveScopeEnforcement(
  value: unknown,
  allowedValues: string[],
): ProjectScopeEnforcement | undefined {
  if (!allowedValues.length) {
    return undefined
  }
  return normalizeScopeEnforcement(value)
}

function normalizeProjectOptions(rows: RawProjectOption[]): ProjectOption[] {
  return rows.map((row, index) => {
    const id = parseEntityId(row.id, `projects[${index}].project.id`)
    const customerId = parseEntityId(
      row.customerId,
      `projects[${index}].customerId`,
    )
    const projectCode = asString(row.projectCode).trim()
    const projectName = asString(row.projectName).trim()
    const projectNameAbbr = asString(row.projectNameAbbr).trim()
    const customerCode = asString(row.customerCode).trim()
    const settlementCompanyId = parseOptionalEntityId(
      row.settlementCompanyId,
      `projects[${index}].settlementCompanyId`,
    )
    const settlementCompanyName = asString(row.settlementCompanyName).trim()
    const priceFloatMode = asString(row.priceFloatMode).trim()
    const priceFloatValueNum = Number(row.priceFloatValue)
    const lastPriceRuleId = parseOptionalEntityId(
      row.lastPriceRuleId,
      `projects[${index}].lastPriceRuleId`,
    )
    const quoteSource = asString(row.quoteSource).trim()
    const quoteRegion = asString(row.quoteRegion).trim()

    const allowedBrands = normalizeAllowedSpec(row.allowedBrands)
    const allowedMaterials = normalizeAllowedSpec(row.allowedMaterials)
    const allowedBrandSeverity = resolveScopeEnforcement(
      row.allowedBrandSeverity,
      allowedBrands,
    )
    const allowedMaterialSeverity = resolveScopeEnforcement(
      row.allowedMaterialSeverity,
      allowedMaterials,
    )

    return {
      id,
      value: id,
      customerId,
      projectCode,
      projectName,
      label: projectName || `#${id}`,
      ...(customerCode ? { customerCode } : {}),
      ...(projectNameAbbr ? { projectNameAbbr } : {}),
      ...(settlementCompanyId ? { settlementCompanyId } : {}),
      ...(settlementCompanyName ? { settlementCompanyName } : {}),
      ...(priceFloatMode === 'ADD' || priceFloatMode === 'SUBTRACT'
        ? { priceFloatMode }
        : {}),
      ...(Number.isFinite(priceFloatValueNum)
        ? { priceFloatValue: priceFloatValueNum }
        : {}),
      ...(lastPriceRuleId ? { lastPriceRuleId } : {}),
      ...(quoteSource === 'MYSTEEL' || quoteSource === 'STEELX'
        ? { quoteSource }
        : {}),
      ...(quoteRegion ? { quoteRegion } : {}),
      allowedBrands,
      allowedMaterials,
      ...(allowedBrandSeverity ? { allowedBrandSeverity } : {}),
      ...(allowedMaterialSeverity ? { allowedMaterialSeverity } : {}),
    }
  })
}

/** 查询单个项目的取价数据源与地区(比价页按项目 id 取)。 */
export async function fetchProjectQuoteConfig(
  projectId: EntityId,
  signal?: AbortSignal,
): Promise<{ quoteSource?: ProjectQuoteSource; quoteRegion?: string }> {
  const id = parseEntityId(projectId, 'projectId')
  const raw = await apiGet(
    ENDPOINTS.PROJECT(id),
    z.looseObject({
      quoteSource: z.string().nullable().optional(),
      quoteRegion: z.string().nullable().optional(),
    }),
    signal ? { signal } : {},
  )
  const source = asString(raw.quoteSource).trim()
  const region = asString(raw.quoteRegion).trim()
  return {
    ...(source === 'MYSTEEL' || source === 'STEELX'
      ? { quoteSource: source }
      : {}),
    ...(region ? { quoteRegion: region } : {}),
  }
}

export async function fetchProjectOptions(
  customerId: EntityId,
): Promise<ProjectOption[]> {
  const normalizedCustomerId = parseEntityId(customerId, 'customerId')
  const response = await apiGet(
    ENDPOINTS.PROJECTS_OPTIONS,
    projectOptionsResponseSchema,
    { params: { customerId: normalizedCustomerId } },
  )
  return normalizeProjectOptions(response)
}

const PROJECT_OPTIONS_PAGE_SIZE = 200

/**
 * 拉取**全部启用项目**的原始分页行。
 *
 * <p>项目下拉必须覆盖全部启用项目：按总页数拉全，避免只取首页截断后选不到。
 * 多个出口（缩写下拉、比价页项目选择器）共用这一份取数，不要在别处再写一遍分页。</p>
 */
async function fetchAllEnabledProjectRows(
  signal?: AbortSignal,
): Promise<RawProjectPageRow[]> {
  const fetchPage = (page: number) =>
    apiGet(ENDPOINTS.PROJECTS, projectPageResponseSchema, {
      params: {
        page,
        size: PROJECT_OPTIONS_PAGE_SIZE,
        sortBy: 'projectCode',
        direction: 'asc',
        status: '正常',
      },
      signal,
    })

  const firstPage = await fetchPage(0)
  const restPages = await Promise.all(
    Array.from({ length: Math.max(firstPage.totalPages - 1, 0) }, (_, index) =>
      fetchPage(index + 1),
    ),
  )
  return [firstPage, ...restPages].flatMap((page) => page.content)
}

export async function fetchProjectAbbreviationOptions(
  signal?: AbortSignal,
): Promise<ProjectAbbreviationOption[]> {
  return toProjectAbbreviationOptions(await fetchAllEnabledProjectRows(signal))
}

/** 比价页项目选择器需要的形态：id + 全称 + 简称。 */
export type ProjectPickerRow = {
  id: EntityId
  name: string
  abbr: string
  /** 项目允许的品牌；空数组表示不限制。 */
  allowedBrands: string[]
}

/**
 * 比价页项目选择器的数据源。
 *
 * <p><b>为什么必须走后端</b>：项目是用户在「基础数据 → 项目资料」里随时新建的业务主数据，
 * 不是构建期常量。此前该清单是打包进前端的 `data/projects.json`，导致</p>
 * <ol>
 *   <li>新建的项目在比价页永远看不到，必须改 JSON 重新发版；</li>
 *   <li>同一实体在数据库与前端各存一份，已经漂移：JSON 里有两条记录的 `id`
 *       其实是后端的 `projectCode`，按错误 id 查取价配置直接 404。</li>
 * </ol>
 * <p>接口按 id 返回，天然与主数据一致，不再有第二份清单需要人工同步。</p>
 */
export async function fetchProjectPickerOptions(
  signal?: AbortSignal,
): Promise<ProjectPickerRow[]> {
  const rows = await fetchAllEnabledProjectRows(signal)
  return rows.map((row, index) => {
    const id = parseEntityId(row.id, `projects[${index}].id`)
    const name = asString(row.projectName).trim()
    return {
      id,
      name: name || `#${id}`,
      abbr: asString(row.projectNameAbbr).trim() || name || `#${id}`,
      allowedBrands: normalizeAllowedSpec(row.allowedBrands),
    }
  })
}
