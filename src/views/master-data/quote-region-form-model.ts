import type { Rule } from 'antd/es/form'
import type { TFunction } from 'i18next'
import {
  parseQuoteRegionStatus,
  QUOTE_REGION_MAX_NAME_LENGTH,
  QUOTE_REGION_MAX_REMARK_LENGTH,
  QUOTE_REGION_MAX_SLUG_LENGTH,
  QUOTE_REGION_SLUG_PATTERN,
  QUOTE_REGION_STATUSES,
  type QuoteRegionInputDraft,
  type QuoteRegionRecord,
  type QuoteRegionStatus,
} from '@/api/master/quote-regions'
import { STATUS } from '@/constants/status-constants'
import type { EntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

/**
 * 取价地区维护弹窗的表单模型。
 *
 * <p>校验文案与 {@link quoteRegionInputSchema}（后端 422 的同一套业务不变量）保持一致，
 * 但拆成字段级规则是为了「即时提示」：超长、slug 非法字符、城市名/子域名重复都在输入时就能看到，
 * 不必等一次 round-trip 的 422。提交时仍会再用 Zod schema 归一化一次，写路径只有一套口径。</p>
 */

/** 状态下拉的 i18n key：值与后端 `StatusConstants`（正常/禁用）一一对应。 */
export const QUOTE_REGION_STATUS_LABEL_KEYS: Record<QuoteRegionStatus, string> =
  {
    [STATUS.NORMAL]: 'quoteRegion.statusNormal',
    [STATUS.DISABLED]: 'quoteRegion.statusDisabled',
  }

/** antd 表单字段值；`sortOrder` 允许为空（`InputNumber` 清空后是 null）。 */
export interface QuoteRegionFormValues {
  regionName: string
  slug: string
  sortOrder: number | null
  status: string
  remark?: string | null | undefined
}

/** 新增时的默认值：状态默认「正常」，排序号留空由用户显式给出抓取顺序。 */
export const EMPTY_QUOTE_REGION_FORM_VALUES: QuoteRegionFormValues = {
  regionName: '',
  slug: '',
  sortOrder: null,
  status: STATUS.NORMAL,
  remark: '',
}

export interface QuoteRegionStatusOption {
  label: string
  value: QuoteRegionStatus
}

export function buildQuoteRegionStatusOptions(
  t: TFunction,
): QuoteRegionStatusOption[] {
  return QUOTE_REGION_STATUSES.map((status) => ({
    value: status,
    label: t(QUOTE_REGION_STATUS_LABEL_KEYS[status]),
  }))
}

export interface QuoteRegionStatusMeta {
  color: string
  label: string
}

/**
 * 状态标签元数据：与 `StatusTag` 的 `statusMap` 结构兼容（其余字段可选）。
 *
 * <p>未知状态不在这里兜底 —— `StatusTag` 会把原值原样显示出来，避免把后端新状态悄悄显示成「正常」。</p>
 */
export function buildQuoteRegionStatusMap(
  t: TFunction,
): Record<string, QuoteRegionStatusMeta> {
  return {
    [STATUS.NORMAL]: {
      color: 'green',
      label: t(QUOTE_REGION_STATUS_LABEL_KEYS[STATUS.NORMAL]),
    },
    [STATUS.DISABLED]: {
      color: 'default',
      label: t(QUOTE_REGION_STATUS_LABEL_KEYS[STATUS.DISABLED]),
    },
  }
}

/** 数字字段的宽松解析：空值/非数字 → null（由规则区分「必填」与「必须为整数」）。 */
function toOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const text = asString(value).trim()
  if (!text) {
    return null
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * 在**已加载的记录**里查找同名城市（trim 后区分大小写精确匹配，与后端
 * `existsByRegionNameAndDeletedFlagFalse` 一致）。
 *
 * <p>只做尽力而为的即时提示：加载的是当前分页，落在别的分页上的冲突查不到，仍由后端
 * 422 兜底。反过来不会误报 —— 查到的都是真实存在的记录。</p>
 */
export function findDuplicateRegionName(
  records: readonly QuoteRegionRecord[],
  regionName: unknown,
  excludeId?: EntityId | null,
): QuoteRegionRecord | null {
  const target = asString(regionName).trim()
  if (!target) {
    return null
  }
  const excluded = excludeId ? String(excludeId) : ''
  return (
    records.find(
      (record) =>
        record.regionName === target && (!excluded || record.id !== excluded),
    ) ?? null
  )
}

/**
 * 在**已加载的记录**里查找同子域名；比较口径与后端
 * `existsBySlugAndDeletedFlagFalse` 一致（trim 后精确匹配，slug 本身只允许小写）。
 */
export function findDuplicateSlug(
  records: readonly QuoteRegionRecord[],
  slug: unknown,
  excludeId?: EntityId | null,
): QuoteRegionRecord | null {
  const target = asString(slug).trim()
  if (!target) {
    return null
  }
  const excluded = excludeId ? String(excludeId) : ''
  return (
    records.find(
      (record) =>
        record.slug === target && (!excluded || record.id !== excluded),
    ) ?? null
  )
}

export interface QuoteRegionRuleContext {
  t: TFunction
  /** 当前已加载的记录，用于城市名/子域名重复的即时提示。 */
  records: readonly QuoteRegionRecord[]
  /** 编辑中的记录 ID；新增时为 null。 */
  editingId: EntityId | null
}

function reject(message: string): Promise<never> {
  return Promise.reject(new Error(message))
}

/** 城市名称：必填、≤32、同城市名不重复。 */
export function buildRegionNameRules(context: QuoteRegionRuleContext): Rule[] {
  const { t, records, editingId } = context
  return [
    {
      validator: (_rule, value: unknown) => {
        const text = asString(value).trim()
        if (!text) {
          return reject(t('quoteRegion.regionNameRequired'))
        }
        if (text.length > QUOTE_REGION_MAX_NAME_LENGTH) {
          return reject(t('quoteRegion.regionNameTooLong'))
        }
        const duplicate = findDuplicateRegionName(records, text, editingId)
        if (duplicate) {
          return reject(
            t('quoteRegion.regionNameDuplicate', {
              value: duplicate.regionName,
            }),
          )
        }
        return Promise.resolve()
      },
    },
  ]
}

/** 子域名：必填、≤64、只允许小写字母/数字/连字符、不与其他城市重复。 */
export function buildSlugRules(context: QuoteRegionRuleContext): Rule[] {
  const { t, records, editingId } = context
  return [
    {
      validator: (_rule, value: unknown) => {
        const text = asString(value).trim()
        if (!text) {
          return reject(t('quoteRegion.slugRequired'))
        }
        if (text.length > QUOTE_REGION_MAX_SLUG_LENGTH) {
          return reject(t('quoteRegion.slugTooLong'))
        }
        if (!QUOTE_REGION_SLUG_PATTERN.test(text)) {
          return reject(t('quoteRegion.slugInvalid'))
        }
        const duplicate = findDuplicateSlug(records, text, editingId)
        if (duplicate) {
          return reject(
            t('quoteRegion.slugDuplicate', { value: duplicate.slug }),
          )
        }
        return Promise.resolve()
      },
    },
  ]
}

/** 排序号：必填、非负整数（后端 `@NotNull` + `@Min(0)`）。 */
export function buildSortOrderRules(context: QuoteRegionRuleContext): Rule[] {
  const { t } = context
  return [
    {
      validator: (_rule, value: unknown) => {
        const numberValue = toOptionalNumber(value)
        if (numberValue === null) {
          return reject(t('quoteRegion.sortOrderRequired'))
        }
        if (!Number.isInteger(numberValue)) {
          return reject(t('quoteRegion.sortOrderInteger'))
        }
        if (numberValue < 0) {
          return reject(t('quoteRegion.sortOrderNegative'))
        }
        return Promise.resolve()
      },
    },
  ]
}

/** 状态：必选且在白名单内（合法值只有「正常」与「禁用」）。 */
export function buildStatusRules(context: QuoteRegionRuleContext): Rule[] {
  const { t } = context
  return [
    {
      validator: (_rule, value: unknown) =>
        parseQuoteRegionStatus(value)
          ? Promise.resolve()
          : reject(
              asString(value).trim()
                ? t('quoteRegion.statusInvalid')
                : t('quoteRegion.statusRequired'),
            ),
    },
  ]
}

/** 备注：可空、≤255。 */
export function buildRemarkRules(context: QuoteRegionRuleContext): Rule[] {
  const { t } = context
  return [
    {
      validator: (_rule, value: unknown) =>
        asString(value).trim().length > QUOTE_REGION_MAX_REMARK_LENGTH
          ? reject(t('quoteRegion.remarkTooLong'))
          : Promise.resolve(),
    },
  ]
}

export interface QuoteRegionFormRules {
  regionName: Rule[]
  slug: Rule[]
  sortOrder: Rule[]
  status: Rule[]
  remark: Rule[]
}

export function buildQuoteRegionFormRules(
  context: QuoteRegionRuleContext,
): QuoteRegionFormRules {
  return {
    regionName: buildRegionNameRules(context),
    slug: buildSlugRules(context),
    sortOrder: buildSortOrderRules(context),
    status: buildStatusRules(context),
    remark: buildRemarkRules(context),
  }
}

/** 记录 → 表单值（编辑态）。 */
export function toQuoteRegionFormValues(
  record: QuoteRegionRecord,
): QuoteRegionFormValues {
  return {
    regionName: record.regionName,
    slug: record.slug,
    sortOrder: record.sortOrder,
    // 未知状态原样回填：下拉会显示原值，保存时由白名单规则拦住，而不是悄悄改成「正常」。
    status: asString(record.status).trim(),
    remark: record.remark ?? '',
  }
}

/**
 * 表单值 → 写入请求体草稿：字符串一律 trim，空备注不下发。
 *
 * <p>不做大小写折叠：slug 直接拼进主机名，静默改写会抓错站点，非法字符交给
 * Zod schema（`quoteRegionInputSchema`）与后端 422 拦下。</p>
 */
export function toQuoteRegionInputDraft(
  values: QuoteRegionFormValues,
): QuoteRegionInputDraft {
  const remark = asString(values.remark).trim()
  return {
    regionName: asString(values.regionName).trim(),
    slug: asString(values.slug).trim(),
    sortOrder: toOptionalNumber(values.sortOrder),
    status: asString(values.status).trim(),
    ...(remark ? { remark } : {}),
  }
}

/** Zod issue 的最小结构（避免这里依赖 zod 的内部类型名）。 */
export interface QuoteRegionIssue {
  path: readonly PropertyKey[]
  message: string
}

export interface QuoteRegionFieldError {
  name: keyof QuoteRegionFormValues
  errors: string[]
}

const FORM_FIELD_NAMES: ReadonlySet<string> = new Set([
  'regionName',
  'slug',
  'sortOrder',
  'status',
  'remark',
])

function isFormFieldName(
  value: PropertyKey,
): value is keyof QuoteRegionFormValues {
  return typeof value === 'string' && FORM_FIELD_NAMES.has(value)
}

/**
 * Zod 校验失败 → antd `form.setFields` 需要的字段错误。
 *
 * <p>单个字段的多条 issue 归并到同一个 `errors` 数组；字段名不在表单里的 issue
 * （理论上只有根级问题）挂到 `regionName`，保证错误不会被静默丢弃。</p>
 */
export function toQuoteRegionFieldErrors(
  issues: readonly QuoteRegionIssue[],
): QuoteRegionFieldError[] {
  const grouped = new Map<keyof QuoteRegionFormValues, string[]>()
  for (const issue of issues) {
    const field = issue.path.find(isFormFieldName) ?? 'regionName'
    const messages = grouped.get(field) ?? []
    if (!messages.includes(issue.message)) {
      messages.push(issue.message)
    }
    grouped.set(field, messages)
  }
  return [...grouped].map(([name, errors]) => ({ name, errors }))
}
